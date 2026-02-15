import {
  BattleAction,
  BattleState,
  BattleWarrior,
  CombatEvent,
  Lane,
} from '@/types/game';
import { getWarriorById } from '@/data/cards';
import {
  applyActiveSkills,
  applyPassiveSkills,
  checkUltimateSkills,
} from './skills/passive';
import { BattleEngineOptions } from './types';

export function hasStatus(warrior: BattleWarrior, type: BattleWarrior['statusEffects'][number]['type']): boolean {
  return warrior.statusEffects.some((e) => e.type === type && e.turnsLeft > 0);
}

const MAX_STALEMATE_TURNS = 8;

export function getStatusValue(warrior: BattleWarrior, type: BattleWarrior['statusEffects'][number]['type']): number {
  const effect = warrior.statusEffects.find((e) => e.type === type && e.turnsLeft > 0);
  return effect ? effect.value : 0;
}

export function hasAliveWarrior(warriors: BattleWarrior[]): boolean {
  return warriors.some((w) => w.isAlive);
}

function getTotalHp(warriors: BattleWarrior[]): number {
  return warriors.reduce((sum, warrior) => sum + Math.max(0, warrior.currentHp), 0);
}

export function getAliveByLane(warriors: BattleWarrior[], lane: Lane): BattleWarrior | undefined {
  return warriors.find((w) => w.lane === lane && w.isAlive);
}

export function getFirstAlive(warriors: BattleWarrior[]): BattleWarrior | undefined {
  const order: Lane[] = ['front', 'mid', 'back'];
  for (const lane of order) {
    const warrior = getAliveByLane(warriors, lane);
    if (warrior) return warrior;
  }
  return undefined;
}

export function applyDamage(
  target: BattleWarrior,
  damage: number,
  events: CombatEvent[],
  isSkill = false
): number {
  const actual = Math.max(1, damage);
  target.currentHp = Math.max(0, target.currentHp - actual);
  events.push({
    type: 'damage',
    targetInstanceId: target.instanceId,
    value: actual,
    isSkillDamage: isSkill,
  });
  if (target.currentHp <= 0) {
    target.isAlive = false;
    events.push({
      type: 'death',
      targetInstanceId: target.instanceId,
    });
  }
  return actual;
}

export function findTarget(enemies: BattleWarrior[], attacker: BattleWarrior): BattleWarrior | undefined {
  const taunter = enemies.find((w) => w.isAlive && hasStatus(w, 'taunt'));
  if (taunter) return taunter;

  if (attacker.cardId === 'w-huang-zhong' || hasStatus(attacker, 'back_attack')) {
    return getFirstAlive(enemies);
  }

  return getFirstAlive(enemies);
}

export function performAttack(
  state: BattleState,
  attacker: BattleWarrior,
  target: BattleWarrior,
  side: 'player' | 'enemy',
  events: CombatEvent[],
  actions: BattleAction[]
) {
  const attackerCard = getWarriorById(attacker.cardId);
  const targetCard = getWarriorById(target.cardId);
  if (!attackerCard || !targetCard) return;

  const actionEvents: CombatEvent[] = [];
  const actionLog: string[] = [];
  let skillName: string | undefined;

  if (hasStatus(target, 'evasion')) {
    const msg = `🌿 ${targetCard.name} 회피!`;
    state.log.push(msg);
    actionLog.push(msg);
    actionEvents.push({ type: 'miss', targetInstanceId: target.instanceId });
    events.push({ type: 'miss', targetInstanceId: target.instanceId });
    target.statusEffects = target.statusEffects.filter((e) => e.type !== 'evasion');
    actions.push({
      type: 'attack',
      attackerId: attacker.instanceId,
      targetId: target.instanceId,
      side,
      damage: 0,
      events: actionEvents,
      log: actionLog,
    });
    return;
  }

  if (target.cardId === 'w-zhang-fei' && target.lane === 'front') {
    const blocked = target.statusEffects.find((e) => e.type === 'defense_up' && e.value === 999);
    if (blocked) {
      const msg = `🛡️ ${targetCard.name} 장판교! 첫 공격 완전 방어!`;
      state.log.push(msg);
      actionLog.push(msg);
      actionEvents.push({
        type: 'skill',
        targetInstanceId: target.instanceId,
        skillName: '장판교',
      });
      events.push({
        type: 'skill',
        targetInstanceId: target.instanceId,
        skillName: '장판교',
      });
      target.statusEffects = target.statusEffects.filter(
        (e) => !(e.type === 'defense_up' && e.value === 999)
      );
      actions.push({
        type: 'attack',
        attackerId: attacker.instanceId,
        targetId: target.instanceId,
        side,
        damage: 0,
        events: actionEvents,
        log: actionLog,
        skillName: '장판교',
      });
      return;
    }
  }

  let atk = attacker.stats.attack + getStatusValue(attacker, 'attack_up');
  const def = target.stats.defense;

  if (attacker.cardId === 'w-pang-de' && attacker.currentHp / attacker.maxHp <= 0.3) {
    atk *= 2;
    const msg = `💪 ${attackerCard.name} 결사항전! 무력 2배!`;
    state.log.push(msg);
    actionLog.push(msg);
    skillName = '결사항전';
    actionEvents.push({
      type: 'skill',
      targetInstanceId: attacker.instanceId,
      skillName: '결사항전',
    });
    events.push({
      type: 'skill',
      targetInstanceId: attacker.instanceId,
      skillName: '결사항전',
    });
  }

  if (attacker.cardId === 'w-guan-yu') {
    const hasSkill = attackerCard.skills.some((s) => s.name === '청룡언월도');
    if (hasSkill) {
      atk = Math.floor(atk * 1.5);
      skillName = '청룡언월도';
      actionEvents.push({
        type: 'skill',
        targetInstanceId: attacker.instanceId,
        skillName: '청룡언월도',
      });
      events.push({
        type: 'skill',
        targetInstanceId: attacker.instanceId,
        skillName: '청룡언월도',
      });
    }
  }

  const ignoreDefense = attackerCard.skills.some((s) => s.name === '무쌍');
  const damage = ignoreDefense ? Math.max(1, atk) : Math.max(1, atk - def);

  const actual = applyDamage(target, damage, actionEvents);
  events.push(...actionEvents.filter((e) => e.type === 'damage' || e.type === 'death'));

  const sideLabel = side === 'player' ? '' : '적';
  const msg = `⚔️ ${sideLabel}${attackerCard.name} → ${targetCard.name} ${actual} 데미지${target.isAlive ? ` (HP: ${target.currentHp}/${target.maxHp})` : ' 💀 전사!'}`;
  state.log.push(msg);
  actionLog.push(msg);

  actions.push({
    type: 'attack',
    attackerId: attacker.instanceId,
    targetId: target.instanceId,
    side,
    damage: actual,
    events: [...actionEvents],
    log: [...actionLog],
    skillName,
  });

  if (attacker.cardId === 'w-lu-bu' && attacker.isAlive) {
    const opponents = side === 'player' ? state.enemy.warriors : state.player.warriors;
    const adjacent = opponents.filter((w) => w.isAlive && w.instanceId !== target.instanceId);
    if (adjacent.length > 0) {
      const adj = adjacent[0];
      const adjDmg = Math.max(1, Math.floor(atk * 0.5));
      const adjEvents: CombatEvent[] = [];
      applyDamage(adj, adjDmg, adjEvents);
      events.push(...adjEvents);
      adjEvents.push({
        type: 'skill',
        targetInstanceId: attacker.instanceId,
        skillName: '방천화극',
      });
      events.push({
        type: 'skill',
        targetInstanceId: attacker.instanceId,
        skillName: '방천화극',
      });
      const adjMsg = `🔱 방천화극! ${getWarriorById(adj.cardId)?.name}에게 ${adjDmg} 추가 데미지`;
      state.log.push(adjMsg);
      const lastAction = actions[actions.length - 1];
      if (lastAction?.type === 'attack') {
        lastAction.events.push(...adjEvents);
        lastAction.log.push(adjMsg);
      }
    }
  }

  if (attacker.cardId === 'w-gan-ning' && state.turn === 1 && target.isAlive) {
    const extraDmg = Math.max(1, Math.floor(atk * 0.5));
    const extraEvents: CombatEvent[] = [];
    applyDamage(target, extraDmg, extraEvents);
    events.push(...extraEvents);
    extraEvents.push({
      type: 'skill',
      targetInstanceId: attacker.instanceId,
      skillName: '야습',
    });
    events.push({
      type: 'skill',
      targetInstanceId: attacker.instanceId,
      skillName: '야습',
    });
    const extraMsg = `🌙 ${attackerCard.name} 야습! 추가 ${extraDmg} 데미지`;
    state.log.push(extraMsg);
    const lastAction = actions[actions.length - 1];
    if (lastAction?.type === 'attack') {
      lastAction.events.push(...extraEvents);
      lastAction.log.push(extraMsg);
    }
  }
}

export function resolveCombat(
  state: BattleState,
  options: BattleEngineOptions = {}
): { state: BattleState; actions: BattleAction[] } {
  const random = options.random ?? { next: Math.random };
  const newState = structuredClone(state);
  const order: Lane[] = ['front', 'mid', 'back'];
  const actions: BattleAction[] = [];
  const allEvents: CombatEvent[] = [];

  const resultIfNoAlive = () => {
    if (!hasAliveWarrior(newState.player.warriors) || !hasAliveWarrior(newState.enemy.warriors)) {
      const result = hasAliveWarrior(newState.enemy.warriors) ? 'lose' : 'win';
      newState.result = result;
      newState.phase = 'result';
      const msg = result === 'win' ? '🎉 승리! 적 전멸!' : '💀 패배... 아군 전멸...';
      newState.log.push(msg);
      actions.push({ type: 'turn_end', newTurn: newState.turn, phase: 'result', result, log: [msg] });
      newState.combatEvents = allEvents;
      return true;
    }
    return false;
  };

  if (resultIfNoAlive()) {
    return { state: newState, actions };
  }

  actions.push({ type: 'turn_start', turn: newState.turn });

  applyPassiveSkills(newState, 'player', allEvents, actions);
  applyPassiveSkills(newState, 'enemy', allEvents, actions);

  applyActiveSkills(newState, 'player', allEvents, actions, random);
  applyActiveSkills(newState, 'enemy', allEvents, actions, random);

  checkUltimateSkills(newState, 'player', allEvents, actions);
  checkUltimateSkills(newState, 'enemy', allEvents, actions);

  for (const lane of order) {
    const pWarrior = getAliveByLane(newState.player.warriors, lane);
    const pFieldSkip = !!(pWarrior && lane === 'front' && newState.turn === 1 && newState.fieldEvent.effect === 'skip_front_first_turn');
    if (pWarrior && pFieldSkip) {
      const name = getWarriorById(pWarrior.cardId)?.name || '';
      const msg = `🌙 ${name} 야간 기습 영향으로 1턴 행동 불가`;
      newState.log.push(msg);
      actions.push({ type: 'forced_skip', warriorId: pWarrior.instanceId, warriorName: name, side: 'player', reason: 'field_event', log: [msg] });
    } else if (pWarrior && !hasStatus(pWarrior, 'stun')) {
      const target = findTarget(newState.enemy.warriors, pWarrior);
      if (target) performAttack(newState, pWarrior, target, 'player', allEvents, actions);
    } else if (pWarrior && hasStatus(pWarrior, 'stun')) {
      const name = getWarriorById(pWarrior.cardId)?.name || '';
      const msg = `💫 ${name} 기절 상태! 행동 불가`;
      newState.log.push(msg);
      actions.push({ type: 'stun_skip', warriorId: pWarrior.instanceId, warriorName: name, side: 'player', log: [msg] });
    }

    const eWarrior = getAliveByLane(newState.enemy.warriors, lane);
    const eFieldSkip = !!(eWarrior && lane === 'front' && newState.turn === 1 && newState.fieldEvent.effect === 'skip_front_first_turn');
    if (eWarrior && eFieldSkip) {
      const name = getWarriorById(eWarrior.cardId)?.name || '';
      const msg = `🌙 ${name} 야간 기습 영향으로 1턴 행동 불가`;
      newState.log.push(msg);
      actions.push({ type: 'forced_skip', warriorId: eWarrior.instanceId, warriorName: name, side: 'enemy', reason: 'field_event', log: [msg] });
    } else if (eWarrior && !hasStatus(eWarrior, 'stun')) {
      const target = findTarget(newState.player.warriors, eWarrior);
      if (target) performAttack(newState, eWarrior, target, 'enemy', allEvents, actions);
    } else if (eWarrior && hasStatus(eWarrior, 'stun')) {
      const name = getWarriorById(eWarrior.cardId)?.name || '';
      const msg = `💫 ${name} 기절 상태! 행동 불가`;
      newState.log.push(msg);
      actions.push({ type: 'stun_skip', warriorId: eWarrior.instanceId, warriorName: name, side: 'enemy', log: [msg] });
    }
  }

  [...newState.player.warriors, ...newState.enemy.warriors].forEach((w) => {
    w.statusEffects = w.statusEffects
      .map((e) => ({ ...e, turnsLeft: e.turnsLeft - 1 }))
      .filter((e) => e.turnsLeft > 0);
  });

  [...newState.player.warriors, ...newState.enemy.warriors].forEach((w) => {
    if (w.cardId === 'w-sima-yi' && w.isAlive) {
      const bonus = 1 + Math.floor((w.level - 1) / 8);
      w.stats.defense += bonus;
      newState.log.push(`🏰 ${getWarriorById(w.cardId)?.name} 은인자중 발동! 방어+${bonus}`);
      allEvents.push({
        type: 'skill',
        targetInstanceId: w.instanceId,
        skillName: '은인자중',
      });
    }
  });

  const playerAlive = newState.player.warriors.filter((w) => w.isAlive).length;
  const enemyAlive = newState.enemy.warriors.filter((w) => w.isAlive).length;
  const turnEndLog: string[] = [];
  const playerHpBefore = getTotalHp(newState.player.warriors);
  const enemyHpBefore = getTotalHp(newState.enemy.warriors);

  if (enemyAlive === 0) {
    newState.result = 'win';
    newState.phase = 'result';
    const msg = '🎉 승리! 적 전멸!';
    newState.log.push(msg);
    turnEndLog.push(msg);
    actions.push({ type: 'turn_end', newTurn: newState.turn, phase: 'result', result: 'win', log: turnEndLog });
  } else if (playerAlive === 0) {
    newState.result = 'lose';
    newState.phase = 'result';
    const msg = '💀 패배... 아군 전멸...';
    newState.log.push(msg);
    turnEndLog.push(msg);
    actions.push({ type: 'turn_end', newTurn: newState.turn, phase: 'result', result: 'lose', log: turnEndLog });
  } else {
    const playerHpAfter = getTotalHp(newState.player.warriors);
    const enemyHpAfter = getTotalHp(newState.enemy.warriors);
    const hadDamage = playerHpAfter < playerHpBefore || enemyHpAfter < enemyHpBefore;
    newState.stalemateTurns = hadDamage ? 0 : newState.stalemateTurns + 1;

    if (newState.stalemateTurns >= MAX_STALEMATE_TURNS) {
      newState.result = 'draw';
      const msg = `🤝 교착! ${MAX_STALEMATE_TURNS}턴 무피해로 무승부`;
      newState.log.push(msg);
      turnEndLog.push(msg);
    } else if (newState.turn >= newState.maxTurns) {
      newState.result = 'draw';
      const playerHp = getTotalHp(newState.player.warriors);
      const enemyHp = getTotalHp(newState.enemy.warriors);
      const msg = `⏱️ ${newState.maxTurns}턴 제한으로 무승부`;
      newState.log.push(msg);
      turnEndLog.push(msg);
      if (playerHp > enemyHp) {
        turnEndLog.push(`(참고) 아군 HP ${playerHp} > 적군 HP ${enemyHp}`);
      } else if (enemyHp > playerHp) {
        turnEndLog.push(`(참고) 적군 HP ${enemyHp} > 아군 HP ${playerHp}`);
      } else {
        turnEndLog.push(`(참고) HP 동률 ${playerHp}`);
      }
    }

    if (newState.result) {
      newState.phase = 'result';
      actions.push({
        type: 'turn_end',
        newTurn: newState.turn,
        phase: 'result',
        result: newState.result,
        log: turnEndLog,
      });
    } else {
      newState.turn += 1;
      newState.phase = 'tactic';
      newState.player.selectedTactic = null;
      newState.enemy.selectedTactic = null;
      const msg = `\n──── 턴 ${newState.turn} ────`;
      newState.log.push(msg);
      turnEndLog.push(msg);
      actions.push({
        type: 'turn_end',
        newTurn: newState.turn,
        phase: 'tactic',
        result: null,
        log: turnEndLog,
      });
    }
  }

  newState.combatEvents = allEvents;
  return { state: newState, actions };
}
