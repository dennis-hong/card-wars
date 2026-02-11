import {
  BattleState,
  BattleWarrior,
  BattleFieldEvent,
  WarriorStats,
  Lane,
  Deck,
  OwnedCard,
  StatusEffect,
  CombatEvent,
  BattleAction,
  Grade,
} from '@/types/game';
import { getWarriorById, getTacticById, WARRIOR_CARDS, TACTIC_CARDS } from '@/data/cards';
import { getRandomEvent } from '@/data/battlefield-events';
import { generateId } from './uuid';

// ============================================================
// Initialize Battle
// ============================================================

function createBattleWarrior(
  instanceId: string,
  cardId: string,
  lane: Lane,
  level: number,
  fieldEvent: BattleFieldEvent
): BattleWarrior {
  const card = getWarriorById(cardId);
  if (!card) throw new Error(`Card not found: ${cardId}`);

  const levelBonus = level - 1;
  const baseStats: WarriorStats = {
    attack: card.stats.attack + levelBonus,
    command: card.stats.command + levelBonus,
    intel: card.stats.intel + levelBonus,
    defense: card.stats.defense + Math.floor(levelBonus * 0.5),
  };

  // Apply field event stat modifiers
  const stats = { ...baseStats };
  if (fieldEvent.effect === 'defense_plus_2') stats.defense += 2;
  if (fieldEvent.effect === 'attack_plus_2') stats.attack += 2;
  if (fieldEvent.effect === 'front_defense_plus_3' && lane === 'front') stats.defense += 3;
  if (fieldEvent.effect === 'back_attack_minus_2' && lane === 'back') stats.attack = Math.max(1, stats.attack - 2);
  if (fieldEvent.effect === 'morale_boost') stats.attack += 1;
  if (fieldEvent.effect === 'wu_bonus' && card.faction === '오') {
    stats.attack += 1;
    stats.command += 1;
    stats.intel += 1;
    stats.defense += 1;
  }

  const hp = stats.command * 3;

  return {
    instanceId,
    cardId,
    lane,
    currentHp: hp,
    maxHp: hp,
    stats,
    baseStats,
    isAlive: true,
    statusEffects: [],
  };
}

export function initBattle(
  playerDeck: Deck,
  ownedCards: OwnedCard[],
  wins: number = 0
): BattleState {
  const fieldEvent = getRandomEvent();

  // Build player warriors
  const playerWarriors = playerDeck.warriors.map((slot) => {
    const owned = ownedCards.find((c) => c.instanceId === slot.instanceId);
    return createBattleWarrior(
      slot.instanceId,
      owned?.cardId || '',
      slot.lane,
      owned?.level || 1,
      fieldEvent
    );
  });

  // Build player tactics
  const playerTactics = playerDeck.tactics.map((tid) => {
    const owned = ownedCards.find((c) => c.instanceId === tid);
    return { instanceId: tid, cardId: owned?.cardId || '', used: false };
  });

  // Compute player deck info for AI matching
  const deckCards = playerDeck.warriors.map((slot) => {
    const owned = ownedCards.find((c) => c.instanceId === slot.instanceId);
    const card = owned ? getWarriorById(owned.cardId) : null;
    return { grade: (card?.grade || 1) as Grade, level: owned?.level || 1 };
  });
  const playerMaxGrade = Math.max(...deckCards.map((c) => c.grade)) as Grade;
  const playerAvgLevel = deckCards.reduce((sum, c) => sum + c.level, 0) / deckCards.length;

  // Build AI enemy - matched to player strength
  const enemyWarriors = buildAITeam(fieldEvent, playerMaxGrade, playerAvgLevel, wins);
  const enemyTactics = buildAITactics();

  // Apply faction synergy and collect synergy info
  const playerSynergies = applyFactionSynergy(playerWarriors).map(s => ({ ...s, side: 'player' as const }));
  const enemySynergies = applyFactionSynergy(enemyWarriors).map(s => ({ ...s, side: 'enemy' as const }));
  const activeSynergies = [...playerSynergies, ...enemySynergies];

  // Apply 의형제 (Liu Bei) - double 촉 synergy
  applyBrothersSynergy(playerWarriors, playerSynergies);
  applyBrothersSynergy(enemyWarriors, enemySynergies);

  const battleState: BattleState = {
    turn: 1,
    maxTurns: 3,
    phase: 'tactic',
    player: {
      warriors: playerWarriors,
      tactics: playerTactics,
      selectedTactic: null,
    },
    enemy: {
      warriors: enemyWarriors,
      tactics: enemyTactics,
      selectedTactic: null,
    },
    fieldEvent,
    log: [
      `⚡ 전장 이벤트: ${fieldEvent.name} - ${fieldEvent.description}`,
    ],
    result: null,
    combatEvents: [],
    activeSynergies: activeSynergies.length > 0 ? activeSynergies : undefined,
    ultimateTriggered: null,
  };

  // Apply battle-start skills (1회성)
  applyBattleStartSkills(battleState, 'player', battleState.log);
  applyBattleStartSkills(battleState, 'enemy', battleState.log);

  return battleState;
}

function buildAITeam(
  fieldEvent: BattleFieldEvent,
  playerMaxGrade: Grade,
  playerAvgLevel: number,
  wins: number
): BattleWarrior[] {
  // Determine AI grade cap based on player's max grade + win progression
  let gradeCap: Grade = playerMaxGrade;
  if (wins >= 16 && gradeCap < 4) {
    gradeCap = Math.min(4, gradeCap + 1) as Grade;
  }

  // Filter card pool by grade cap
  const pool = WARRIOR_CARDS.filter((c) => c.grade <= gradeCap);
  const available = [...pool];
  const lanes: Lane[] = ['front', 'mid', 'back'];
  const picked: BattleWarrior[] = [];

  // AI level range: based on player avg level
  const minLevel = Math.max(1, Math.floor(playerAvgLevel) - 1);
  const maxLevel = Math.floor(playerAvgLevel) + 1;

  // Stat penalty: weaker AI at low wins, neutral at higher wins
  const statPenalty = wins < 6 ? -1 : 0;

  for (const lane of lanes) {
    if (available.length === 0) break;
    const idx = Math.floor(Math.random() * available.length);
    const card = available.splice(idx, 1)[0];
    const level = minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1));
    const warrior = createBattleWarrior(generateId(), card.id, lane, level, fieldEvent);

    // Apply stat penalty for early game fairness
    if (statPenalty !== 0) {
      warrior.stats.attack = Math.max(1, warrior.stats.attack + statPenalty);
      warrior.stats.command = Math.max(1, warrior.stats.command + statPenalty);
      warrior.stats.intel = Math.max(1, warrior.stats.intel + statPenalty);
      warrior.stats.defense = Math.max(0, warrior.stats.defense + statPenalty);
      warrior.baseStats = { ...warrior.stats };
      // Recalculate HP after command change
      const hp = warrior.stats.command * 3;
      warrior.maxHp = hp;
      warrior.currentHp = hp;
    }

    picked.push(warrior);
  }

  return picked;
}

function buildAITactics() {
  const pool = [...TACTIC_CARDS];
  const tactics = [];
  for (let i = 0; i < 2; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const card = pool.splice(idx, 1)[0];
    tactics.push({ instanceId: generateId(), cardId: card.id, used: false });
  }
  return tactics;
}

function applyFactionSynergy(warriors: BattleWarrior[]): { faction: string; effect: string; level: 'minor' | 'major' }[] {
  const factions = warriors.map((w) => getWarriorById(w.cardId)?.faction);
  const synergies: { faction: string; effect: string; level: 'minor' | 'major' }[] = [];

  // Count faction occurrences
  const factionCounts: Record<string, number> = {};
  for (const f of factions) {
    if (f) factionCounts[f] = (factionCounts[f] || 0) + 1;
  }

  for (const [faction, count] of Object.entries(factionCounts)) {
    if (count >= 3) {
      // Major synergy (3/3)
      warriors.forEach((w) => {
        if (getWarriorById(w.cardId)?.faction === faction) {
          switch (faction) {
            case '위': w.stats.defense += 2; break;
            case '촉': w.stats.attack += 2; break;
            case '오': w.stats.intel += 2; break;
            case '군벌': w.stats.command += 2; w.maxHp += 6; w.currentHp += 6; break;
          }
        }
      });
      const effectMap: Record<string, string> = { '위': '방어+2', '촉': '무력+2', '오': '지력+2', '군벌': '통솔+2' };
      synergies.push({ faction, effect: effectMap[faction], level: 'major' });
    } else if (count >= 2) {
      // Minor synergy (2/3)
      warriors.forEach((w) => {
        if (getWarriorById(w.cardId)?.faction === faction) {
          switch (faction) {
            case '위': w.stats.defense += 1; break;
            case '촉': w.stats.attack += 1; break;
            case '오': w.stats.intel += 1; break;
            case '군벌': w.stats.command += 1; w.maxHp += 3; w.currentHp += 3; break;
          }
        }
      });
      const effectMap: Record<string, string> = { '위': '방어+1', '촉': '무력+1', '오': '지력+1', '군벌': '통솔+1' };
      synergies.push({ faction, effect: effectMap[faction], level: 'minor' });
    }
  }
  return synergies;
}

// ============================================================
// 의형제 (Liu Bei) - 촉 synergy doubled
// ============================================================

function applyBrothersSynergy(
  warriors: BattleWarrior[],
  synergies: { faction: string; effect: string; level: 'minor' | 'major' }[]
) {
  const hasLiuBei = warriors.some((w) => w.cardId === 'w-liu-bei' && w.isAlive);
  if (!hasLiuBei) return;

  const shuSynergy = synergies.find((s) => s.faction === '촉');
  if (!shuSynergy) return;

  // Double the 촉 synergy bonus (apply it again)
  warriors.forEach((w) => {
    if (getWarriorById(w.cardId)?.faction === '촉') {
      const bonus = shuSynergy.level === 'major' ? 2 : 1;
      w.stats.attack += bonus;
    }
  });
}

// ============================================================
// Battle Start Skills (1회성, initBattle 시 적용)
// ============================================================

function applyBattleStartSkills(state: BattleState, side: 'player' | 'enemy', log: string[]) {
  const team = state[side];
  const opponent = side === 'player' ? state.enemy : state.player;

  team.warriors.forEach((w) => {
    if (!w.isAlive) return;
    const card = getWarriorById(w.cardId);
    if (!card) return;

    // 간웅 (Cao Cao passive) - 적 전법 1회 무효
    if (card.id === 'w-cao-cao') {
      team.warriors[0].statusEffects.push({ type: 'tactic_nullify', value: 1, turnsLeft: 99 });
      log.push(`🛡️ ${card.name} 간웅 발동! 적 전법 1회 무효화 준비`);
    }

    // 대의 (Sun Quan passive) - 오 세력 방어+1
    if (card.id === 'w-sun-quan') {
      team.warriors.forEach((ally) => {
        if (getWarriorById(ally.cardId)?.faction === '오' && ally.isAlive) {
          ally.stats.defense += 1;
        }
      });
      log.push(`🛡️ ${card.name} 대의 발동! 오 세력 방어+1`);
    }

    // 폭정 (Dong Zhuo active) - 적 전체 통솔-2
    if (card.id === 'w-dong-zhuo') {
      opponent.warriors.forEach((e) => {
        if (e.isAlive) {
          e.stats.command = Math.max(1, e.stats.command - 2);
          e.maxHp = e.stats.command * 3;
          e.currentHp = Math.min(e.currentHp, e.maxHp);
        }
      });
      log.push(`😈 ${card.name} 폭정 발동! 적 전체 통솔-2`);
    }

    // 용병술 (Sun Quan active) - 전법 카드 추가 사용 가능 (전투 시작 시 전법 1장 추가)
    if (card.id === 'w-sun-quan' && team.tactics.length > 0) {
      // Duplicate first tactic as extra use
      const extraTactic = { ...team.tactics[0], instanceId: generateId(), used: false };
      team.tactics.push(extraTactic);
      log.push(`📜 ${card.name} 용병술 발동! 전법 카드 1장 추가`);
    }
  });
}

// ============================================================
// Combat Resolution
// ============================================================

function getAliveByLane(warriors: BattleWarrior[], lane: Lane): BattleWarrior | undefined {
  return warriors.find((w) => w.lane === lane && w.isAlive);
}

function getFirstAlive(warriors: BattleWarrior[]): BattleWarrior | undefined {
  const order: Lane[] = ['front', 'mid', 'back'];
  for (const lane of order) {
    const w = getAliveByLane(warriors, lane);
    if (w) return w;
  }
  return undefined;
}

function hasStatus(warrior: BattleWarrior, type: StatusEffect['type']): boolean {
  return warrior.statusEffects.some((e) => e.type === type && e.turnsLeft > 0);
}

function getStatusValue(warrior: BattleWarrior, type: StatusEffect['type']): number {
  const effect = warrior.statusEffects.find((e) => e.type === type && e.turnsLeft > 0);
  return effect ? effect.value : 0;
}

function applyDamage(target: BattleWarrior, damage: number, events: CombatEvent[], isSkill = false): number {
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
    events.push({ type: 'death', targetInstanceId: target.instanceId });
  }
  return actual;
}

// ============================================================
// Tactic Phase Resolution
// ============================================================

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

  const tacticCard = getTacticById(tactic.cardId);
  if (!tacticCard) return { state: newState, action: null };

  // Check if opponent has counter (반계)
  const counterIdx = opponent.tactics.findIndex(
    (t) => t.cardId === 't-counter' && !t.used
  );

  tactic.used = true;

  // Check 간웅 (Cao Cao) - 적 전법 1회 무효
  const nullifyIdx = opponent.warriors.findIndex((w) =>
    w.isAlive && w.statusEffects.some((e) => e.type === 'tactic_nullify' && e.turnsLeft > 0)
  );
  if (nullifyIdx >= 0) {
    const nullifier = opponent.warriors[nullifyIdx];
    nullifier.statusEffects = nullifier.statusEffects.filter((e) => e.type !== 'tactic_nullify');
    const nullName = getWarriorById(nullifier.cardId)?.name || '';
    const msg = `🛡️ ${nullName} 간웅 발동! ${tacticCard.name} 무효화!`;
    newState.log.push(msg);
    logLines.push(msg);
    events.push({ type: 'skill', targetInstanceId: nullifier.instanceId, skillName: '간웅' });
    newState.combatEvents = events;
    return {
      state: newState,
      action: { type: 'tactic_use', side, tacticName: tacticCard.name, tacticEmoji: tacticCard.emoji, events, log: logLines },
    };
  }

  // Check field event fire disable
  if (tacticCard.id === 't-fire' && state.fieldEvent.effect === 'disable_fire') {
    const msg = `🔥 ${tacticCard.name} 사용! 하지만 폭우로 인해 무효화됨!`;
    newState.log.push(msg);
    logLines.push(msg);
    newState.combatEvents = events;
    return {
      state: newState,
      action: { type: 'tactic_use', side, tacticName: tacticCard.name, tacticEmoji: tacticCard.emoji, events, log: logLines },
    };
  }

  const sideLabel = side === 'player' ? '아군' : '적군';

  // Add skill name event
  events.push({
    type: 'skill',
    targetInstanceId: actor.warriors[0]?.instanceId || '',
    skillName: `${tacticCard.emoji} ${tacticCard.name}`,
  });

  switch (tacticCard.id) {
    case 't-fire': {
      let dmg = 4;
      if (state.fieldEvent.effect === 'fire_boost') dmg *= 2;
      const hasZhouYu = actor.warriors.some(
        (w) => w.cardId === 'w-zhou-yu' && w.isAlive
      );
      if (hasZhouYu) dmg *= 2;
      const hasZhuge = actor.warriors.some(
        (w) => w.cardId === 'w-zhuge-liang' && w.isAlive
      );
      if (hasZhuge) dmg *= 2;

      opponent.warriors.filter((w) => w.isAlive).forEach((w) => {
        applyDamage(w, dmg, events, true);
      });
      const msg = `🔥 ${sideLabel} 화공! 적 전체에 ${dmg} 데미지!`;
      newState.log.push(msg);
      logLines.push(msg);
      break;
    }
    case 't-ambush': {
      const target = getFirstAlive(actor.warriors);
      if (target) {
        target.statusEffects.push({ type: 'evasion', value: 1, turnsLeft: 1 });
        const msg = `🌿 ${sideLabel} 매복! ${getWarriorById(target.cardId)?.name} 회피 부여`;
        newState.log.push(msg);
        logLines.push(msg);
      }
      break;
    }
    case 't-chain': {
      const target = getFirstAlive(opponent.warriors);
      if (target) {
        target.statusEffects.push({ type: 'stun', value: 1, turnsLeft: 1 });
        const msg = `⛓️ ${sideLabel} 연환계! ${getWarriorById(target.cardId)?.name} 행동불가`;
        newState.log.push(msg);
        logLines.push(msg);
      }
      break;
    }
    case 't-taunt': {
      const front = getAliveByLane(actor.warriors, 'front');
      if (front) {
        front.statusEffects.push({ type: 'taunt', value: 1, turnsLeft: 1 });
        const msg = `😤 ${sideLabel} 도발! 적 공격이 전위에 집중`;
        newState.log.push(msg);
        logLines.push(msg);
      }
      break;
    }
    case 't-heal': {
      const aliveAllies = actor.warriors.filter((w) => w.isAlive);
      const lowest = aliveAllies.reduce((a, b) =>
        (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b
      );
      if (lowest) {
        const heal = 5;
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
        target.statusEffects.push({ type: 'attack_up', value: 3, turnsLeft: 1 });
        const msg = `⬆️ ${sideLabel} 강화! ${getWarriorById(target.cardId)?.name} 무력+3`;
        newState.log.push(msg);
        logLines.push(msg);
      }
      break;
    }
    case 't-rockfall': {
      const target = getFirstAlive(opponent.warriors);
      if (target) {
        const dmg = 8;
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

  // If counter was set and this wasn't the counter itself
  if (counterIdx >= 0 && tacticCard.id !== 't-counter') {
    opponent.tactics[counterIdx].used = true;
    const msg = `🔄 반계 발동! 전법이 반사됨!`;
    newState.log.push(msg);
    logLines.push(msg);
    const reflectedDmg = 3;
    actor.warriors.filter((w) => w.isAlive).forEach((w) => {
      applyDamage(w, reflectedDmg, events, true);
    });
  }

  newState.combatEvents = events;
  return {
    state: newState,
    action: { type: 'tactic_use', side, tacticName: tacticCard.name, tacticEmoji: tacticCard.emoji, events, log: logLines },
  };
}

// ============================================================
// Combat Phase - Returns actions array for sequential playback
// ============================================================

export function resolveCombat(state: BattleState): { state: BattleState; actions: BattleAction[] } {
  const newState = structuredClone(state);
  const order: Lane[] = ['front', 'mid', 'back'];
  const actions: BattleAction[] = [];
  const allEvents: CombatEvent[] = [];

  // Turn start action
  actions.push({ type: 'turn_start', turn: newState.turn });

  // Apply passive skills at combat start
  applyPassiveSkills(newState, 'player', allEvents, actions);
  applyPassiveSkills(newState, 'enemy', allEvents, actions);

  // Apply active skills (턴 시작 시 확률/조건부 발동)
  applyActiveSkills(newState, 'player', allEvents, actions);
  applyActiveSkills(newState, 'enemy', allEvents, actions);

  // Check for ultimate skills
  checkUltimateSkills(newState, 'player', allEvents, actions);
  checkUltimateSkills(newState, 'enemy', allEvents, actions);

  // Each lane attacks in order
  for (const lane of order) {
    // Player attacks
    const pWarrior = getAliveByLane(newState.player.warriors, lane);
    if (pWarrior && !hasStatus(pWarrior, 'stun')) {
      const target = findTarget(newState.enemy.warriors, pWarrior);
      if (target) {
        performAttack(newState, pWarrior, target, 'player', allEvents, actions);
      }
    } else if (pWarrior && hasStatus(pWarrior, 'stun')) {
      const name = getWarriorById(pWarrior.cardId)?.name || '';
      const msg = `💫 ${name} 기절 상태! 행동 불가`;
      newState.log.push(msg);
      actions.push({ type: 'stun_skip', warriorId: pWarrior.instanceId, warriorName: name, side: 'player', log: [msg] });
    }

    // Enemy attacks
    const eWarrior = getAliveByLane(newState.enemy.warriors, lane);
    if (eWarrior && !hasStatus(eWarrior, 'stun')) {
      const target = findTarget(newState.player.warriors, eWarrior);
      if (target) {
        performAttack(newState, eWarrior, target, 'enemy', allEvents, actions);
      }
    } else if (eWarrior && hasStatus(eWarrior, 'stun')) {
      const name = getWarriorById(eWarrior.cardId)?.name || '';
      const msg = `💫 ${name} 기절 상태! 행동 불가`;
      newState.log.push(msg);
      actions.push({ type: 'stun_skip', warriorId: eWarrior.instanceId, warriorName: name, side: 'enemy', log: [msg] });
    }
  }

  // Tick down status effects
  [...newState.player.warriors, ...newState.enemy.warriors].forEach((w) => {
    w.statusEffects = w.statusEffects
      .map((e) => ({ ...e, turnsLeft: e.turnsLeft - 1 }))
      .filter((e) => e.turnsLeft > 0);
  });

  // Apply 은인자중 (Sima Yi passive) - defense+1 at end of turn
  [...newState.player.warriors, ...newState.enemy.warriors].forEach((w) => {
    if (w.cardId === 'w-sima-yi' && w.isAlive) {
      w.stats.defense += 1;
      newState.log.push(`🏰 ${getWarriorById(w.cardId)?.name} 은인자중 발동! 방어+1`);
      allEvents.push({
        type: 'skill',
        targetInstanceId: w.instanceId,
        skillName: '은인자중',
      });
    }
  });

  // Check win/loss
  const playerAlive = newState.player.warriors.filter((w) => w.isAlive).length;
  const enemyAlive = newState.enemy.warriors.filter((w) => w.isAlive).length;
  const turnEndLog: string[] = [];

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
  } else if (newState.turn >= newState.maxTurns) {
    const playerHp = newState.player.warriors.reduce((sum, w) => sum + w.currentHp, 0);
    const enemyHp = newState.enemy.warriors.reduce((sum, w) => sum + w.currentHp, 0);
    if (playerHp > enemyHp) {
      newState.result = 'win';
      const msg = `🎉 승리! HP 합산 ${playerHp} vs ${enemyHp}`;
      newState.log.push(msg);
      turnEndLog.push(msg);
    } else if (playerHp < enemyHp) {
      newState.result = 'lose';
      const msg = `💀 패배... HP 합산 ${playerHp} vs ${enemyHp}`;
      newState.log.push(msg);
      turnEndLog.push(msg);
    } else {
      newState.result = 'draw';
      const msg = `🤝 무승부! HP 합산 ${playerHp} vs ${enemyHp}`;
      newState.log.push(msg);
      turnEndLog.push(msg);
    }
    newState.phase = 'result';
    actions.push({ type: 'turn_end', newTurn: newState.turn, phase: 'result', result: newState.result, log: turnEndLog });
  } else {
    newState.turn += 1;
    newState.phase = 'tactic';
    newState.player.selectedTactic = null;
    newState.enemy.selectedTactic = null;
    const msg = `\n──── 턴 ${newState.turn} ────`;
    newState.log.push(msg);
    turnEndLog.push(msg);
    actions.push({ type: 'turn_end', newTurn: newState.turn, phase: 'tactic', result: null, log: turnEndLog });
  }

  newState.combatEvents = allEvents;
  return { state: newState, actions };
}

function findTarget(enemies: BattleWarrior[], attacker: BattleWarrior): BattleWarrior | undefined {
  const taunter = enemies.find((w) => w.isAlive && hasStatus(w, 'taunt'));
  if (taunter) return taunter;

  // 백발백중 (Huang Zhong) - 후위에서도 전위 공격 가능
  if (attacker.cardId === 'w-huang-zhong' || hasStatus(attacker, 'back_attack')) {
    return getFirstAlive(enemies);
  }

  return getFirstAlive(enemies);
}

function performAttack(
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

  // Check evasion
  if (hasStatus(target, 'evasion')) {
    const msg = `🌿 ${targetCard.name} 회피!`;
    state.log.push(msg);
    actionLog.push(msg);
    actionEvents.push({ type: 'miss', targetInstanceId: target.instanceId });
    events.push({ type: 'miss', targetInstanceId: target.instanceId });
    target.statusEffects = target.statusEffects.filter((e) => e.type !== 'evasion');
    actions.push({ type: 'attack', attackerId: attacker.instanceId, targetId: target.instanceId, side, damage: 0, events: actionEvents, log: actionLog });
    return;
  }

  // Check 장판교 (Zhang Fei passive) - first attack blocked
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
      target.statusEffects = target.statusEffects.filter((e) => !(e.type === 'defense_up' && e.value === 999));
      actions.push({ type: 'attack', attackerId: attacker.instanceId, targetId: target.instanceId, side, damage: 0, events: actionEvents, log: actionLog, skillName: '장판교' });
      return;
    }
  }

  // Calculate damage
  let atk = attacker.stats.attack + getStatusValue(attacker, 'attack_up');
  const def = target.stats.defense;

  // Check 결사항전 (Pang De) - double attack at low HP
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

  // Check 청룡언월도 (Guan Yu active) - 1.5x damage
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

  // Check 무쌍 (Lu Bu) - ignore defense
  const ignoreDefense = attackerCard.skills.some((s) => s.name === '무쌍');
  const damage = ignoreDefense ? Math.max(1, atk) : Math.max(1, atk - def);

  const actual = applyDamage(target, damage, actionEvents);
  // Also push to main events
  events.push(...actionEvents.filter(e => e.type === 'damage' || e.type === 'death'));

  const sideLabel = side === 'player' ? '' : '적';
  const msg = `⚔️ ${sideLabel}${attackerCard.name} → ${targetCard.name} ${actual} 데미지${target.isAlive ? ` (HP: ${target.currentHp}/${target.maxHp})` : ' 💀 전사!'}`;
  state.log.push(msg);
  actionLog.push(msg);

  // Create the main attack action
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

  // Check 방천화극 (Lu Bu) - adjacent damage
  if (attacker.cardId === 'w-lu-bu' && attacker.isAlive) {
    const opponents = side === 'player' ? state.enemy.warriors : state.player.warriors;
    const adjacent = opponents.filter(
      (w) => w.isAlive && w.instanceId !== target.instanceId
    );
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
      // Append Lu Bu extra hit to the last action's events
      const lastAction = actions[actions.length - 1];
      if (lastAction && lastAction.type === 'attack') {
        lastAction.events.push(...adjEvents);
        lastAction.log.push(adjMsg);
      }
    }
  }

  // Check 감녕 야습 (first turn extra attack)
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
    // Append to last action
    const lastAction = actions[actions.length - 1];
    if (lastAction && lastAction.type === 'attack') {
      lastAction.events.push(...extraEvents);
      lastAction.log.push(extraMsg);
    }
  }
}

function applyActiveSkills(state: BattleState, side: 'player' | 'enemy', events: CombatEvent[], actions: BattleAction[]) {
  const team = state[side];
  const opponent = side === 'player' ? state.enemy : state.player;

  team.warriors.forEach((w) => {
    if (!w.isAlive) return;
    const card = getWarriorById(w.cardId);
    if (!card) return;

    const skillEvents: CombatEvent[] = [];
    const skillLog: string[] = [];

    switch (card.id) {
      // 조조 패왕의 기세 - 아군 전체 무력+2 (턴 시작 시 30%)
      case 'w-cao-cao': {
        if (Math.random() < 0.3) {
          team.warriors.forEach((ally) => {
            if (ally.isAlive) {
              ally.stats.attack += 2;
            }
          });
          skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '패왕의 기세' });
          events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '패왕의 기세' });
          const msg = `👑 ${card.name} 패왕의 기세 발동! 아군 전체 무력+2`;
          state.log.push(msg);
          skillLog.push(msg);
        }
        break;
      }

      // 사마의 공성계 - 적 전위 1턴 행동불가 (턴 시작 시 25%)
      case 'w-sima-yi': {
        if (Math.random() < 0.25) {
          const frontEnemy = getFirstAlive(opponent.warriors);
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

      // 서황 철벽수비 - HP 50% 이하일 때 방어+2
      case 'w-xu-huang': {
        if (w.currentHp / w.maxHp <= 0.5) {
          w.statusEffects.push({ type: 'defense_up', value: 2, turnsLeft: 1 });
          w.stats.defense += 2;
          skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '철벽수비' });
          events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '철벽수비' });
          const msg = `🛡️ ${card.name} 철벽수비 발동! 방어+2`;
          state.log.push(msg);
          skillLog.push(msg);
        }
        break;
      }

      // 유비 인덕 - 아군 전체 HP+3 회복 (턴 시작 시 30%)
      case 'w-liu-bei': {
        if (Math.random() < 0.3) {
          team.warriors.forEach((ally) => {
            if (ally.isAlive) {
              const heal = 3;
              ally.currentHp = Math.min(ally.maxHp, ally.currentHp + heal);
              skillEvents.push({ type: 'heal', targetInstanceId: ally.instanceId, value: heal });
              events.push({ type: 'heal', targetInstanceId: ally.instanceId, value: heal });
            }
          });
          skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '인덕' });
          events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '인덕' });
          const msg = `💚 ${card.name} 인덕 발동! 아군 전체 HP+3 회복`;
          state.log.push(msg);
          skillLog.push(msg);
        }
        break;
      }

      // 제갈량 팔진도 - 적 전체 지력 기반 데미지 (턴 시작 시 25%)
      case 'w-zhuge-liang': {
        if (Math.random() < 0.25) {
          const dmg = Math.max(1, w.stats.intel);
          opponent.warriors.filter((e) => e.isAlive).forEach((e) => {
            applyDamage(e, dmg, skillEvents, true);
          });
          events.push(...skillEvents.filter(e => e.type === 'damage' || e.type === 'death'));
          skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '팔진도' });
          events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '팔진도' });
          const msg = `🌀 ${card.name} 팔진도 발동! 적 전체 ${dmg} 지력 데미지`;
          state.log.push(msg);
          skillLog.push(msg);
        }
        break;
      }

      // 주유 미주공 is listed under 주유 in user spec, but cards.ts has it on w-zhou-yu
      case 'w-zhou-yu': {
        // 미주공 - 적 지력-3 (턴 시작 시 1회, turn 1 only)
        if (state.turn === 1) {
          opponent.warriors.forEach((e) => {
            if (e.isAlive) {
              e.stats.intel = Math.max(0, e.stats.intel - 3);
            }
          });
          skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '미주공' });
          events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '미주공' });
          const msg = `🍺 ${card.name} 미주공 발동! 적 전체 지력-3`;
          state.log.push(msg);
          skillLog.push(msg);
        }

        // 팔진도 (주유 also has it per user spec) - 적 전체 지력 기반 데미지 (25%)
        if (Math.random() < 0.25) {
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

      // 감녕 미주공 - 적 지력-3 (턴 시작 시 1회)
      case 'w-gan-ning': {
        if (state.turn === 1) {
          opponent.warriors.forEach((e) => {
            if (e.isAlive) {
              e.stats.intel = Math.max(0, e.stats.intel - 3);
            }
          });
          skillEvents.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '미주공' });
          events.push({ type: 'skill', targetInstanceId: w.instanceId, skillName: '미주공' });
          const msg = `🍺 ${card.name} 미주공 발동! 적 전체 지력-3`;
          state.log.push(msg);
          skillLog.push(msg);
        }
        break;
      }

      // 장비 뇌성벽력 - HP 40% 이하 시 적 전위 1턴 기절
      case 'w-zhang-fei': {
        if (w.currentHp / w.maxHp <= 0.4) {
          const frontEnemy = getFirstAlive(opponent.warriors);
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

function applyPassiveSkills(state: BattleState, side: 'player' | 'enemy', events: CombatEvent[], actions: BattleAction[]) {
  const team = state[side];

  team.warriors.forEach((w) => {
    if (!w.isAlive) return;
    const card = getWarriorById(w.cardId);
    if (!card) return;

    // 위풍당당 (Zhang Liao) - front lane attack+3
    if (card.id === 'w-zhang-liao' && w.lane === 'front') {
      w.stats.attack = w.baseStats.attack + 3;
      events.push({
        type: 'skill',
        targetInstanceId: w.instanceId,
        skillName: '위풍당당',
      });
      actions.push({
        type: 'passive_skill',
        warriorId: w.instanceId,
        skillName: '위풍당당',
        side,
        log: [`⚔️ ${card.name} 위풍당당 발동! 무력+3`],
      });
    }

    // 의리 (Guan Yu + Liu Bei synergy)
    if (card.id === 'w-guan-yu') {
      const hasLiuBei = team.warriors.some((t) => t.cardId === 'w-liu-bei' && t.isAlive);
      if (hasLiuBei) {
        w.stats.attack = w.baseStats.attack + 2;
        events.push({
          type: 'skill',
          targetInstanceId: w.instanceId,
          skillName: '의리',
        });
        actions.push({
          type: 'passive_skill',
          warriorId: w.instanceId,
          skillName: '의리',
          side,
          log: [`⚔️ ${card.name} 의리 발동! 무력+2`],
        });
      }
    }

    // 장판교 setup
    if (card.id === 'w-zhang-fei' && w.lane === 'front' && state.turn === 1) {
      if (!w.statusEffects.some((e) => e.type === 'defense_up' && e.value === 999)) {
        w.statusEffects.push({ type: 'defense_up', value: 999, turnsLeft: 99 });
      }
    }

    // 백발백중 (Huang Zhong) - 후위에서도 전위 공격 가능 (패시브 마커)
    if (card.id === 'w-huang-zhong' && w.lane === 'back') {
      if (!w.statusEffects.some((e) => e.type === 'back_attack')) {
        w.statusEffects.push({ type: 'back_attack', value: 1, turnsLeft: 99 });
        events.push({
          type: 'skill',
          targetInstanceId: w.instanceId,
          skillName: '백발백중',
        });
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

// ============================================================
// Ultimate Skills
// ============================================================

function checkUltimateSkills(state: BattleState, side: 'player' | 'enemy', events: CombatEvent[], actions: BattleAction[]) {
  const team = state[side];
  const opponent = side === 'player' ? state.enemy : state.player;

  team.warriors.forEach((w) => {
    if (!w.isAlive) return;
    const card = getWarriorById(w.cardId);
    if (!card || card.grade !== 4) return;

    const ultimateSkill = card.skills.find((s) => s.type === 'ultimate');
    if (!ultimateSkill) return;

    // Ultimates trigger at turn 2+ when HP <= 50%
    if (state.turn < 2) return;
    if (w.currentHp / w.maxHp > 0.5) return;

    const ultEvents: CombatEvent[] = [];
    const ultLog: string[] = [];

    switch (card.id) {
      case 'w-lu-bu': {
        // 일기당천 - damage all enemies with attack power
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
        // 출사표 - all allies +2 all stats
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
        // 천리안 - stun first alive enemy
        const frontEnemy = getFirstAlive(opponent.warriors);
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
        // 적벽화공 - massive fire damage to all enemies
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
      actions.push({
        type: 'ultimate_skill',
        warriorId: w.instanceId,
        cardId: card.id,
        skillName: ultimateSkill.name,
        side,
        events: ultEvents,
        log: ultLog,
      });
    }
  });
}

// ============================================================
// AI Tactic Selection
// ============================================================

export function selectAITactic(state: BattleState): number | null {
  const available = state.enemy.tactics
    .map((t, i) => ({ ...t, index: i }))
    .filter((t) => !t.used);

  if (available.length === 0) return null;

  const enemyHealthRatio =
    state.enemy.warriors.reduce((sum, w) => sum + w.currentHp, 0) /
    state.enemy.warriors.reduce((sum, w) => sum + w.maxHp, 0);

  if (enemyHealthRatio < 0.5) {
    const defensive = available.find((t) =>
      ['t-heal', 't-ambush', 't-buff'].includes(t.cardId)
    );
    if (defensive) return defensive.index;
  }

  return available[0].index;
}
