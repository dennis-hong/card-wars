import { BattleState, BattleAction, CombatEvent, BattleWarrior, BattleTactic, MAX_LEVEL } from '@/types/game';
import { getWarriorById } from '@/data/cards';
import { applyDamage } from '../combat';
import { BattleRandom } from '../types';

function hasStatus(warrior: BattleWarrior, type: BattleWarrior['statusEffects'][number]['type']) {
  return warrior.statusEffects.some((e) => e.type === type && e.turnsLeft > 0);
}

export function applyBattleStartSkills(
  state: BattleState,
  side: 'player' | 'enemy',
  log: string[],
  random: BattleRandom = { next: Math.random },
) {
  const team = state[side];
  const opponent = side === 'player' ? state.enemy : state.player;

  team.warriors.forEach((w) => {
    if (!w.isAlive) return;
    const card = getWarriorById(w.cardId);
    if (!card) return;

    if (card.id === 'w-cao-cao') {
      team.warriors[0].statusEffects.push({ type: 'tactic_nullify', value: 1, turnsLeft: 99 });
      log.push(`🛡️ ${card.name} 간웅 발동! 적 전법 1회 무효화 준비`);
    }

    if (card.id === 'w-sun-quan') {
      const bonus = 1 + Math.floor((w.level - 1) / 6);
      team.warriors.forEach((ally) => {
        if (getWarriorById(ally.cardId)?.faction === '오' && ally.isAlive) {
          ally.stats.defense += bonus;
        }
      });
      log.push(`🛡️ ${card.name} 대의 발동! 오 세력 방어+${bonus}`);
    }

    if (card.id === 'w-dong-zhuo') {
      const down = 2 + Math.floor((w.level - 1) / 6);
      opponent.warriors.forEach((e) => {
        if (e.isAlive) {
          e.stats.command = Math.max(1, e.stats.command - down);
          e.maxHp = e.stats.command * 3;
          e.currentHp = Math.min(e.currentHp, e.maxHp);
        }
      });
      log.push(`😈 ${card.name} 폭정 발동! 적 전체 통솔-${down}`);
    }

    if (card.id === 'w-sun-quan' && team.tactics.length > 0) {
      const extraTactic = { ...team.tactics[0], instanceId: `${team.tactics[0].instanceId}-${Math.floor(random.next() * 1000)}`, used: false };
      team.tactics.push(extraTactic);
      log.push(`📜 ${card.name} 용병술 발동! 전법 카드 1장 추가`);
    }
  });
}

export function applyPassiveSkills(
  state: BattleState,
  side: 'player' | 'enemy',
  events: CombatEvent[],
  actions: BattleAction[],
): void {
  const team = state[side];

  team.warriors.forEach((w) => {
    if (!w.isAlive) return;
    const card = getWarriorById(w.cardId);
    if (!card) return;

    if (card.id === 'w-zhang-liao' && w.lane === 'front') {
      w.stats.attack = Math.max(w.stats.attack, w.baseStats.attack + 3);
      events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '위풍당당' });
      actions.push({
        type: 'passive_skill',
        warriorId: w.instanceId,
        skillName: '위풍당당',
        side,
        log: [`⚔️ ${card.name} 위풍당당 발동! 무력+3`],
      });
    }

    if (card.id === 'w-guan-yu') {
      const hasLiuBei = team.warriors.some((t) => t.cardId === 'w-liu-bei' && t.isAlive);
      if (hasLiuBei) {
        w.stats.attack = Math.max(w.stats.attack, w.baseStats.attack + 2);
        events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '의리' });
        actions.push({
          type: 'passive_skill',
          warriorId: w.instanceId,
          skillName: '의리',
          side,
          log: [`⚔️ ${card.name} 의리 발동! 무력+2`],
        });
      }
    }

    if (card.id === 'w-zhang-fei' && w.lane === 'front' && state.turn === 1) {
      if (!w.statusEffects.some((e) => e.type === 'defense_up' && e.value === 999)) {
        w.statusEffects.push({ type: 'defense_up', value: 999, turnsLeft: 99 });
      }
    }

    if (card.id === 'w-huang-zhong' && w.lane === 'back') {
      if (!w.statusEffects.some((e) => e.type === 'back_attack')) {
        w.statusEffects.push({ type: 'back_attack', value: 1, turnsLeft: 99 });
        events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '백발백중' });
        actions.push({
          type: 'passive_skill',
          warriorId: w.instanceId,
          skillName: '백발백중',
          side,
          log: [`🎯 ${card.name} 백발백중! 후위에서도 전위 공격 가능`],
        });
      }
    }
  });
}

export function applyActiveSkills(
  state: BattleState,
  side: 'player' | 'enemy',
  events: CombatEvent[],
  actions: BattleAction[],
  random: BattleRandom = { next: Math.random },
): void {
  const team = state[side];
  const opponent = side === 'player' ? state.enemy : state.player;

  team.warriors.forEach((w) => {
    if (!w.isAlive) return;
    const card = getWarriorById(w.cardId);
    if (!card) return;

    const skillEvents: CombatEvent[] = [];
    const skillLog: string[] = [];

    switch (card.id) {
      case 'w-cao-cao': {
        if (random.next() < 0.3) {
          const bonus = 2 + Math.floor((w.level - 1) / 6);
          team.warriors.forEach((ally) => {
            if (ally.isAlive) ally.stats.attack += bonus;
          });
          skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '패왕의 기세' });
          events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '패왕의 기세' });
          const msg = `👑 ${card.name} 패왕의 기세 발동! 아군 전체 무력+${bonus}`;
          state.log.push(msg);
          skillLog.push(msg);
        }
        break;
      }

      case 'w-sima-yi': {
        if (random.next() < 0.25) {
          const frontEnemy = teamIsEnemyFirstAlive(opponent);
          if (frontEnemy) {
            frontEnemy.statusEffects.push({ type: 'stun', value: 1, turnsLeft: 1 });
            skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '공성계' });
            events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '공성계' });
            const enemyName = getWarriorById(frontEnemy.cardId)?.name || '';
            const msg = `🏯 ${card.name} 공성계 발동! ${enemyName} 1턴 행동불가`;
            state.log.push(msg);
            skillLog.push(msg);
          }
        }
        break;
      }

      case 'w-xu-huang': {
        if (w.currentHp / w.maxHp <= 0.5) {
          const bonus = 2 + Math.floor((w.level - 1) / 6);
          w.statusEffects.push({ type: 'defense_up', value: bonus, turnsLeft: 1 });
          w.stats.defense += bonus;
          skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '철벽수비' });
          events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '철벽수비' });
          const msg = `🛡️ ${card.name} 철벽수비 발동! 방어+${bonus}`;
          state.log.push(msg);
          skillLog.push(msg);
        }
        break;
      }

      case 'w-liu-bei': {
        if (random.next() < 0.3) {
          const heal = 3 + Math.floor((w.level - 1) / 5);
          team.warriors.forEach((ally) => {
            if (ally.isAlive) {
              ally.currentHp = Math.min(ally.maxHp, ally.currentHp + heal);
              events.push({ type: 'heal', targetInstanceId: ally.instanceId, value: heal });
              skillEvents.push({ type: 'heal', targetInstanceId: ally.instanceId, value: heal });
            }
          });
          skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '인덕' });
          events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '인덕' });
          const msg = `💚 ${card.name} 인덕 발동! 아군 전체 HP+${heal} 회복`;
          state.log.push(msg);
          skillLog.push(msg);
        }
        break;
      }

      case 'w-zhuge-liang': {
        if (random.next() < 0.25) {
          const dmg = Math.max(1, w.stats.intel);
          opponent.warriors.filter((e) => e.isAlive).forEach((e) => {
            applyDamage(e, dmg, skillEvents, true);
          });
          events.push(...skillEvents.filter((e) => e.type === 'damage' || e.type === 'death'));
          skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '팔진도' });
          events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '팔진도' });
          const msg = `🌀 ${card.name} 팔진도 발동! 적 전체 ${dmg} 지력 데미지`;
          state.log.push(msg);
          skillLog.push(msg);
        }
        break;
      }

      case 'w-zhou-yu': {
        if (state.turn === 1) {
          opponent.warriors.forEach((e) => {
            if (e.isAlive) e.stats.intel = Math.max(0, e.stats.intel - 3);
          });
          skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '미주공' });
          events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '미주공' });
          const msg = `🍺 ${card.name} 미주공 발동! 적 전체 지력-3`;
          state.log.push(msg);
          skillLog.push(msg);
        }

        if (random.next() < 0.25) {
          const dmg = Math.max(1, w.stats.intel);
          const pjdEvents: CombatEvent[] = [];
          opponent.warriors.filter((e) => e.isAlive).forEach((e) => {
            applyDamage(e, dmg, pjdEvents, true);
          });
          events.push(...pjdEvents);
          skillEvents.push(...pjdEvents);
          skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '팔진도' });
          events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '팔진도' });
          const msg = `🌀 ${card.name} 팔진도 발동! 적 전체 ${dmg} 지력 데미지`;
          state.log.push(msg);
          skillLog.push(msg);
        }
        break;
      }

      case 'w-gan-ning': {
        if (state.turn === 1) {
          opponent.warriors.forEach((e) => {
            if (e.isAlive) e.stats.intel = Math.max(0, e.stats.intel - 3);
          });
          skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '미주공' });
          events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '미주공' });
          const msg = `🍺 ${card.name} 미주공 발동! 적 전체 지력-3`;
          state.log.push(msg);
          skillLog.push(msg);
        }
        break;
      }

      case 'w-zhang-fei': {
        if (w.currentHp / w.maxHp <= 0.4) {
          const frontEnemy = teamIsEnemyFirstAlive(opponent);
          if (frontEnemy) {
            frontEnemy.statusEffects.push({ type: 'stun', value: 1, turnsLeft: 1 });
            skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '뇌성벽력' });
            events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '뇌성벽력' });
            const enemyName = getWarriorById(frontEnemy.cardId)?.name || '';
            const msg = `⚡ ${card.name} 뇌성벽력 발동! ${enemyName} 1턴 기절`;
            state.log.push(msg);
            skillLog.push(msg);
          }
        }
        break;
      }
    }

    if (skillLog.length > 0) {
      actions.push({
        type: 'active_skill',
        warriorId: w.instanceId,
        skillName: skillLog[0],
        side,
        events: skillEvents,
        log: skillLog,
      });
    }
  });
}

function teamIsEnemyFirstAlive(team: BattleState['player' | 'enemy']) {
  return team.warriors.filter((w) => w.isAlive)[0] ?? null;
}

export function checkUltimateSkills(
  state: BattleState,
  side: 'player' | 'enemy',
  events: CombatEvent[],
  actions: BattleAction[],
): void {
  const team = state[side];
  const opponent = side === 'player' ? state.enemy : state.player;

  team.warriors.forEach((w) => {
    if (!w.isAlive) return;
    const card = getWarriorById(w.cardId);
    if (!card || card.grade !== 4) return;

    const ultimateSkill = card.skills.find((s) => s.type === 'ultimate');
    if (!ultimateSkill) return;
    if (state.turn < 2) return;
    if (w.currentHp / w.maxHp > 0.5) return;
    if (hasStatus(w, 'ultimate_used')) return;

    const ultEvents: CombatEvent[] = [];
    const ultLog: string[] = [];

    switch (card.id) {
      case 'w-lu-bu': {
        const dmg = Math.max(1, w.stats.attack);
        opponent.warriors.filter((e) => e.isAlive).forEach((e) => {
          applyDamage(e, dmg, ultEvents);
        });
        events.push(...ultEvents);
        const msg = `🌟 ${card.name} 궁극기: 일기당천! 적 전체 ${dmg} 데미지!`;
        state.log.push(msg);
        ultLog.push(msg);
        ultEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '궁극: 일기당천' });
        events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '궁극: 일기당천' });
        state.ultimateTriggered = { cardId: card.id, skillName: '일기당천' };
        break;
      }
      case 'w-zhuge-liang': {
        team.warriors.filter((a) => a.isAlive).forEach((a) => {
          a.stats.attack += 2;
          a.stats.command += 2;
          a.stats.intel += 2;
          a.stats.defense += 2;
          a.maxHp += 6;
          a.currentHp = Math.min(a.maxHp, a.currentHp + 6);
          ultEvents.push({ type: 'heal', targetInstanceId: a.instanceId, value: 6 });
          events.push({ type: 'heal', targetInstanceId: a.instanceId, value: 6 });
        });
        const msg = `🌟 ${card.name} 궁극기: 출사표! 아군 전체 스탯+2!`;
        state.log.push(msg);
        ultLog.push(msg);
        ultEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '궁극: 출사표' });
        events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '궁극: 출사표' });
        state.ultimateTriggered = { cardId: card.id, skillName: '출사표' };
        break;
      }
      case 'w-sima-yi': {
        const frontEnemy = teamIsEnemyFirstAlive(opponent);
        if (frontEnemy) {
          frontEnemy.statusEffects.push({ type: 'stun', value: 1, turnsLeft: 1 });
        }
        const msg = `🌟 ${card.name} 궁극기: 천리안! 적 전위 행동불가!`;
        state.log.push(msg);
        ultLog.push(msg);
        ultEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '궁극: 천리안' });
        events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '궁극: 천리안' });
        state.ultimateTriggered = { cardId: card.id, skillName: '천리안' };
        break;
      }
      case 'w-zhou-yu': {
        const dmg = Math.max(1, w.stats.intel + 5);
        opponent.warriors.filter((e) => e.isAlive).forEach((e) => {
          applyDamage(e, dmg, ultEvents, true);
        });
        events.push(...ultEvents);
        const msg = `🌟 ${card.name} 궁극기: 적벽화공! 적 전체 ${dmg} 화염 데미지!`;
        state.log.push(msg);
        ultLog.push(msg);
        ultEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '궁극: 적벽화공' });
        events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '궁극: 적벽화공' });
        state.ultimateTriggered = { cardId: card.id, skillName: '적벽화공' };
        break;
      }
    }

    if (ultLog.length > 0) {
      w.statusEffects.push({ type: 'ultimate_used', value: 1, turnsLeft: 99 });
      const displayName = ultimateSkill.name || '궁극기';
      actions.push({
        type: 'ultimate_skill',
        warriorId: w.instanceId,
        cardId: card.id,
        skillName: displayName,
        side,
        events: ultEvents,
        log: ultLog,
      });
    }
  });
}

export function getMaxLevelForGrade(grade: number): number {
  return MAX_LEVEL[grade as keyof typeof MAX_LEVEL] ?? 1;
}
