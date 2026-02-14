import {
  BattleAction,
  BattleState,
  CombatEvent,
  TacticCardId,
} from '@/types/game';
import { getTacticById, getWarriorById } from '@/data/cards';
import { applyDamage, getFirstAlive } from '../combat';
import { isTacticCardId } from '@/lib/card-utils';

function getCounterTacticIndex(enemy: BattleState['enemy']): number {
  return enemy.tactics.findIndex((t) => isTacticCardId(t.cardId) && t.cardId === 't-counter' && !t.used);
}

function findNullifier(warrior: BattleState['player'] | BattleState['enemy']) {
  return warrior.warriors.findIndex((w) =>
    w.isAlive && w.statusEffects.some((e) => e.type === 'tactic_nullify' && e.turnsLeft > 0)
  );
}

export function applyTactic(
  state: BattleState,
  side: 'player' | 'enemy',
  tacticIndex: number
): { state: BattleState; action: BattleAction | null } {
  const newState = structuredClone(state);
  newState.combatEvents = [];
  const actor = newState[side];
  const opponent = side === 'player' ? newState.enemy : newState.player;
  const events: CombatEvent[] = [];
  const logLines: string[] = [];

  if (tacticIndex < 0 || tacticIndex >= actor.tactics.length) return { state: newState, action: null };
  const tactic = actor.tactics[tacticIndex];
  if (tactic.used) return { state: newState, action: null };

  const tacticLevel = Math.max(1, tactic.level || 1);
  const tacticCard = getTacticById(tactic.cardId);
  if (!tacticCard) return { state: newState, action: null };
  const tacticCardId: TacticCardId = isTacticCardId(tactic.cardId) ? tactic.cardId : 't-fire';

  const counterIdx = getCounterTacticIndex(opponent);
  tactic.used = true;

  const nullifierIdx = findNullifier(opponent);
  if (nullifierIdx >= 0) {
    const nullifier = opponent.warriors[nullifierIdx];
    nullifier.statusEffects = nullifier.statusEffects.filter((e) => e.type !== 'tactic_nullify');
    const nullName = getWarriorById(nullifier.cardId)?.name || '';
    const msg = `🛡️ ${nullName} 간웅 발동! ${tacticCard.name} 무효화!`;
    newState.log.push(msg);
    logLines.push(msg);
    events.push({ type: 'skill', targetInstanceId: nullifier.instanceId, skillName: '간웅' });
    newState.combatEvents = events;
    return {
      state: newState,
      action: {
        type: 'tactic_use',
        side,
        tacticInstanceId: tactic.instanceId,
        tacticCardId,
        tacticName: tacticCard.name,
        events,
        log: logLines,
      },
    };
  }

  if (tacticCardId === 't-fire' && state.fieldEvent.effect === 'disable_fire') {
    const msg = `🔥 ${tacticCard.name} 사용! 하지만 폭우로 인해 무효화됨!`;
    newState.log.push(msg);
    logLines.push(msg);
    newState.combatEvents = events;
    return {
      state: newState,
      action: {
        type: 'tactic_use',
        side,
        tacticInstanceId: tactic.instanceId,
        tacticCardId,
        tacticName: tacticCard.name,
        events,
        log: logLines,
      },
    };
  }

  const sideLabel = side === 'player' ? '아군' : '적군';
  events.push({
    type: 'skill',
    targetInstanceId: actor.warriors[0]?.instanceId || '',
    skillName: tacticCard.name,
  });

  switch (tacticCardId) {
    case 't-fire': {
      let dmg = 4 + (tacticLevel - 1);
      if (state.fieldEvent.effect === 'fire_boost') dmg *= 2;
      if (actor.warriors.some((w) => w.cardId === 'w-zhou-yu' && w.isAlive)) {
        dmg *= 2;
      }
      if (actor.warriors.some((w) => w.cardId === 'w-zhuge-liang' && w.isAlive)) {
        dmg *= 2;
      }

      opponent.warriors.filter((w) => w.isAlive).forEach((w) => {
        applyDamage(w, dmg, events, true);
      });
      const msg = `🔥 ${sideLabel} 화공! 적 전체에 ${dmg} 데미지!`;
      newState.log.push(msg);
      logLines.push(msg);
      break;
    }
    case 't-ambush': {
      const aliveAllies = actor.warriors.filter((w) => w.isAlive);
      if (aliveAllies.length === 0) break;
      const evasionTurns = 1 + Math.floor((tacticLevel - 1) / 5);
      if (state.fieldEvent.effect === 'ambush_boost') {
        aliveAllies.forEach((ally) => {
          ally.statusEffects.push({ type: 'evasion', value: 1, turnsLeft: evasionTurns });
        });
        const msg = `🌿 ${sideLabel} 매복 강화! 아군 전체 회피 ${evasionTurns}턴`;
        newState.log.push(msg);
        logLines.push(msg);
      } else {
        const target = getFirstAlive(actor.warriors);
        if (target) {
          target.statusEffects.push({ type: 'evasion', value: 1, turnsLeft: evasionTurns });
          const msg = `🌿 ${sideLabel} 매복! ${getWarriorById(target.cardId)?.name} 회피 ${evasionTurns}턴`;
          newState.log.push(msg);
          logLines.push(msg);
        }
      }
      break;
    }
    case 't-chain': {
      const target = getFirstAlive(opponent.warriors);
      if (target) {
        const stunTurns = 1 + Math.floor((tacticLevel - 1) / 6);
        target.statusEffects.push({ type: 'stun', value: 1, turnsLeft: stunTurns });
        const msg = `⛓️ ${sideLabel} 연환계! ${getWarriorById(target.cardId)?.name} ${stunTurns}턴 행동불가`;
        newState.log.push(msg);
        logLines.push(msg);
      }
      break;
    }
    case 't-taunt': {
      const front = actor.warriors.find((w) => w.lane === 'front' && w.isAlive);
      if (front) {
        const tauntTurns = 1 + Math.floor((tacticLevel - 1) / 6);
        front.statusEffects.push({ type: 'taunt', value: 1, turnsLeft: tauntTurns });
        const msg = `😤 ${sideLabel} 도발! 적 공격이 전위에 ${tauntTurns}턴 집중`;
        newState.log.push(msg);
        logLines.push(msg);
      }
      break;
    }
    case 't-heal': {
      const aliveAllies = actor.warriors.filter((w) => w.isAlive);
      if (aliveAllies.length > 0) {
        const lowest = aliveAllies.reduce((a, b) =>
          (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b
        );
        const heal = 5 + (tacticLevel - 1);
        lowest.currentHp = Math.min(lowest.maxHp, lowest.currentHp + heal);
        events.push({
          type: 'heal',
          targetInstanceId: lowest.instanceId,
          value: heal,
        });
        const msg = `💚 ${sideLabel} 치유! ${getWarriorById(lowest.cardId)?.name} HP+${heal}`;
        newState.log.push(msg);
        logLines.push(msg);
      }
      break;
    }
    case 't-buff': {
      const target = getFirstAlive(actor.warriors);
      if (target) {
        const buffValue = 3 + (tacticLevel - 1);
        const buffTurns = 1 + Math.floor((tacticLevel - 1) / 6);
        target.statusEffects.push({ type: 'attack_up', value: buffValue, turnsLeft: buffTurns });
        const msg = `⬆️ ${sideLabel} 강화! ${getWarriorById(target.cardId)?.name} 무력+${buffValue} (${buffTurns}턴)`;
        newState.log.push(msg);
        logLines.push(msg);
      }
      break;
    }
    case 't-rockfall': {
      const target = getFirstAlive(opponent.warriors);
      if (target) {
        const dmg = 8 + (tacticLevel - 1);
        applyDamage(target, dmg - target.stats.defense, events, true);
        const msg = `🪨 ${sideLabel} 낙석! ${getWarriorById(target.cardId)?.name}에게 ${dmg} 데미지`;
        newState.log.push(msg);
        logLines.push(msg);
      }
      break;
    }
    case 't-counter': {
      const msg = `🔄 ${sideLabel} 반계 준비! 다음 적 전법 반사`;
      newState.log.push(msg);
      logLines.push(msg);
      break;
    }
  }

  if (counterIdx >= 0 && tacticCardId !== 't-counter') {
    opponent.tactics[counterIdx].used = true;
    const msg = `🔄 반계 발동! 전법이 반사됨!`;
    newState.log.push(msg);
    logLines.push(msg);
    const reflectedDmg = 3 + (opponent.tactics[counterIdx].level - 1);
    actor.warriors.filter((w) => w.isAlive).forEach((w) => {
      applyDamage(w, reflectedDmg, events, true);
    });
  }

  newState.combatEvents = events;
  return {
    state: newState,
    action: {
      type: 'tactic_use',
      side,
      tacticInstanceId: tactic.instanceId,
      tacticCardId,
      tacticName: tacticCard.name,
      events,
      log: logLines,
    },
  };
}
