import {
  BattleSynergy,
  BattleFieldEvent,
  BattleState,
  BattleWarrior,
  BattleSynergyEffect,
  BattleSynergyTier,
  Faction,
  Deck,
  Grade,
  Lane,
  OwnedCard,
} from '@/types/game';
import { getRandomEvent, BATTLEFIELD_EVENTS } from '@/data/battlefield-events';
import { getWarriorById } from '@/data/cards';
import { generateId } from '@/lib/uuid';
import { randomPick } from '@/lib/rng';
import { BattleRandom, BattleEngineOptions } from './types';
import { applyBattleStartSkills } from './skills/passive';
import { buildAITeam, buildAITactics } from './ai';

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
  const baseStats = {
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

function applyFactionSynergy(
  warriors: BattleWarrior[],
): Array<BattleSynergy> {
  const factions = warriors.map((w) => getWarriorById(w.cardId)?.faction);
  const synergies: Array<BattleSynergy> = [];

  const factionCounts: Record<string, number> = {};
  for (const f of factions) {
    if (f) factionCounts[f] = (factionCounts[f] || 0) + 1;
  }

  for (const [factionRaw, count] of Object.entries(factionCounts)) {
    if (count < 2) continue;
    const faction = factionRaw as Faction;
    const effectMap: Record<Faction, { [key in BattleSynergyTier]: BattleSynergyEffect }> = {
      위: { minor: '방어+1', major: '방어+2' },
      촉: { minor: '무력+1', major: '무력+2' },
      오: { minor: '지력+1', major: '지력+2' },
      군벌: { minor: '통솔+1', major: '통솔+2' },
    };
    const tier: BattleSynergyTier = count >= 3 ? 'major' : 'minor';
    const effect = effectMap[faction]?.[tier];

    if (!effect) continue;

    if (count >= 3) {
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
      synergies.push({ faction, effect, level: 'major' });
    } else if (count >= 2) {
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
      synergies.push({ faction, effect, level: 'minor' });
    }
  }

  return synergies;
}

function applyBrothersSynergy(warriors: BattleWarrior[], synergies: BattleSynergy[]) {
  const hasLiuBei = warriors.some((w) => w.cardId === 'w-liu-bei' && w.isAlive);
  if (!hasLiuBei) return;

  const shuSynergy = synergies.find((s) => s.faction === '촉');
  if (!shuSynergy) return;

  const bonus = shuSynergy.level === 'major' ? 2 : 1;
  warriors.forEach((w) => {
    if (getWarriorById(w.cardId)?.faction === '촉') {
      w.stats.attack += bonus;
    }
  });
}

export function initBattle(
  playerDeck: Deck,
  ownedCards: OwnedCard[],
  wins: number = 0,
  options: BattleEngineOptions = {},
): BattleState {
  const random = options.random ?? { next: Math.random };
  const fieldEvent = getRandomEventBySeed(random);

  const validSlots = playerDeck.warriors.filter((slot) => {
    const owned = ownedCards.find((c) => c.instanceId === slot.instanceId);
    return !!owned && !!getWarriorById(owned.cardId);
  });

  const playerWarriors: BattleWarrior[] = [];
  for (const slot of validSlots) {
    const owned = ownedCards.find((c) => c.instanceId === slot.instanceId);
    if (!owned) continue;
    const card = getWarriorById(owned.cardId);
    if (!card) continue;
    playerWarriors.push(
      createBattleWarrior(slot.instanceId, owned.cardId, slot.lane, owned.level, fieldEvent)
    );
  }

  const playerTactics = playerDeck.tactics
    .filter((tid) => ownedCards.some((c) => c.instanceId === tid))
    .map((tid) => {
      const owned = ownedCards.find((c) => c.instanceId === tid)!;
      return { instanceId: tid, cardId: owned.cardId, level: owned.level, used: false };
    });

  const deckCards = playerWarriors.map((w) => {
    const card = getWarriorById(w.cardId);
    const owned = ownedCards.find((c) => c.instanceId === w.instanceId);
    return { grade: (card?.grade || 1) as Grade, level: owned?.level || 1 };
  });
  const playerMaxGrade = (deckCards.length > 0 ? Math.max(...deckCards.map((c) => c.grade) ) : 1) as Grade;
  const playerAvgLevel = deckCards.length > 0
    ? deckCards.reduce((sum, c) => sum + c.level, 0) / deckCards.length
    : 1;

  const enemyWarriors = buildAITeam(fieldEvent, playerMaxGrade, playerAvgLevel, wins, random);
  const avgTacticLevel = playerTactics.length > 0
    ? playerTactics.reduce((sum, t) => sum + t.level, 0) / playerTactics.length
    : 1;
  const enemyTactics = buildAITactics(avgTacticLevel, random);

  const playerSynergies = applyFactionSynergy(playerWarriors).map((s) => ({ ...s, side: 'player' as const }));
  const enemySynergies = applyFactionSynergy(enemyWarriors).map((s) => ({ ...s, side: 'enemy' as const }));
  const activeSynergies = [...playerSynergies, ...enemySynergies];

  applyBrothersSynergy(playerWarriors, playerSynergies);
  applyBrothersSynergy(enemyWarriors, enemySynergies);

  const battleState: BattleState = {
    turn: 1,
    maxTurns: 30,
    stalemateTurns: 0,
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
      `\n──── 턴 1 ────`,
    ],
    result: null,
    combatEvents: [],
    activeSynergies: activeSynergies.length > 0 ? activeSynergies : undefined,
    ultimateTriggered: null,
  };

  applyBattleStartSkills(battleState, 'player', battleState.log);
  applyBattleStartSkills(battleState, 'enemy', battleState.log);

  return battleState;
}

export function getRandomEventBySeed(random: BattleRandom): BattleFieldEvent {
  if (BATTLEFIELD_EVENTS.length === 0) {
    return getRandomEvent();
  }

  return randomPick(BATTLEFIELD_EVENTS, random);
}
