import { BattleState, BattleTactic, Lane } from '@/types/game';
import { getWarriorById, WARRIOR_CARDS, TACTIC_CARDS } from '@/data/cards';
import { generateId } from '@/lib/uuid';
import { randomInt } from '@/lib/rng';
import { BattleRandom } from './types';

export function buildAITeam(
  fieldEvent: BattleState['fieldEvent'],
  playerMaxGrade: number,
  playerAvgLevel: number,
  wins: number,
  random: BattleRandom = { next: Math.random },
) {
  let gradeCap = playerMaxGrade;
  if (wins >= 16 && gradeCap < 4) {
    gradeCap = Math.min(4, gradeCap + 1);
  }

  const pool = [...WARRIOR_CARDS].filter((c) => c.grade <= gradeCap);
  const available = [...pool];
  const lanes: Lane[] = ['front', 'mid', 'back'];
  const picked: ReturnType<typeof buildAITacticWarrior>[] = [];

  const minLevel = Math.max(1, Math.floor(playerAvgLevel) - 1);
  const maxLevel = Math.floor(playerAvgLevel) + 1;
  const statPenalty = wins < 6 ? -1 : 0;

  for (const lane of lanes) {
    if (available.length === 0) break;
    const idx = randomInt(available.length, random);
    const card = available.splice(idx, 1)[0];
    const level = minLevel + Math.floor(randomInt((maxLevel - minLevel + 1), random));
    const warrior = buildAITacticWarrior(generateId(), card.id, lane, level, fieldEvent);

    if (statPenalty !== 0) {
      warrior.stats.attack = Math.max(1, warrior.stats.attack + statPenalty);
      warrior.stats.command = Math.max(1, warrior.stats.command + statPenalty);
      warrior.stats.intel = Math.max(1, warrior.stats.intel + statPenalty);
      warrior.stats.defense = Math.max(0, warrior.stats.defense + statPenalty);
      warrior.baseStats = { ...warrior.stats };
      const hp = warrior.stats.command * 3;
      warrior.maxHp = hp;
      warrior.currentHp = hp;
    }

    picked.push(warrior);
  }

  return picked;
}

function buildAITacticWarrior(
  instanceId: string,
  cardId: string,
  lane: Lane,
  level: number,
  fieldEvent: BattleState['fieldEvent'],
) {
  const card = getWarriorById(cardId);
  if (!card) {
    throw new Error(`AI card not found: ${cardId}`);
  }

  const levelBonus = level - 1;
  const baseStats = {
    attack: card.stats.attack + levelBonus,
    command: card.stats.command + levelBonus,
    intel: card.stats.intel + levelBonus,
    defense: card.stats.defense + Math.floor(levelBonus * 0.5),
  };

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
    level,
    lane,
    currentHp: hp,
    maxHp: hp,
    stats,
    baseStats,
    isAlive: true,
    statusEffects: [],
  };
}

export function buildAITactics(playerAvgTacticLevel: number, random: BattleRandom = { next: Math.random }) {
  const pool = [...TACTIC_CARDS];
  const tactics: BattleTactic[] = [];
  const minLevel = Math.max(1, Math.floor(playerAvgTacticLevel) - 1);
  const maxLevel = Math.max(minLevel, Math.floor(playerAvgTacticLevel) + 1);

  for (let i = 0; i < 2; i++) {
    if (pool.length === 0) break;
    const idx = randomInt(pool.length, random);
    const card = pool.splice(idx, 1)[0];
    const level = minLevel + Math.floor(randomInt((maxLevel - minLevel + 1), random));
    tactics.push({ instanceId: generateId(), cardId: card.id, level, used: false });
  }

  return tactics;
}

export function selectAITactic(state: BattleState): number | null {
  const available = state.enemy.tactics
    .map((t, i) => ({ ...t, index: i }))
    .filter((t) => !t.used);

  if (available.length === 0) return null;

  const enemyMaxHp = state.enemy.warriors.reduce((sum, w) => sum + w.maxHp, 0);
  const enemyHealthRatio = enemyMaxHp > 0
    ? state.enemy.warriors.reduce((sum, w) => sum + w.currentHp, 0) / enemyMaxHp
    : 0;

  if (enemyHealthRatio < 0.5) {
    const defensive = available.find((t) =>
      ['t-heal', 't-ambush', 't-buff'].includes(t.cardId)
    );
    if (defensive) return defensive.index;
  }

  return available[0].index;
}
