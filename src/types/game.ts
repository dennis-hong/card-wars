// ============================================================
// Warlords: Card Wars - Game Types
// ============================================================

export type Faction = '위' | '촉' | '오' | '군벌';
export type Grade = 1 | 2 | 3 | 4; // ⭐, ⭐⭐, ⭐⭐⭐, 🌟
export type Lane = 'front' | 'mid' | 'back';

export interface WarriorStats {
  attack: number;   // ⚔️ 무력
  command: number;   // 🛡️ 통솔
  intel: number;     // 🧠 지력
  defense: number;   // 🏰 방어
}

export interface Skill {
  name: string;
  description: string;
  type: 'active' | 'passive' | 'ultimate';
}

export type CardType = 'warrior' | 'tactic';
export type CardCategory = 'warrior' | 'tactic';
export type TacticCardId =
  | 't-fire'
  | 't-ambush'
  | 't-chain'
  | 't-taunt'
  | 't-heal'
  | 't-buff'
  | 't-rockfall'
  | 't-counter';

export type BattleFieldEffect =
  | 'disable_fire'
  | 'defense_plus_2'
  | 'skip_front_first_turn'
  | 'attack_plus_2'
  | 'wu_bonus'
  | 'front_defense_plus_3'
  | 'back_attack_minus_2'
  | 'fire_boost'
  | 'ambush_boost'
  | 'morale_boost';
export type StatusEffectType =
  | 'stun'
  | 'defense_up'
  | 'attack_up'
  | 'intel_down'
  | 'defense_stack'
  | 'evasion'
  | 'taunt'
  | 'command_down'
  | 'tactic_nullify'
  | 'back_attack'
  | 'ultimate_used';
export type BattleSynergyEffect =
  | '방어+1'
  | '방어+2'
  | '무력+1'
  | '무력+2'
  | '지력+1'
  | '지력+2'
  | '통솔+1'
  | '통솔+2';

export type BattleSynergyTier = 'minor' | 'major';
export type BattleActionType =
  | 'turn_start'
  | 'tactic_use'
  | 'passive_skill'
  | 'active_skill'
  | 'ultimate_skill'
  | 'attack'
  | 'stun_skip'
  | 'forced_skip'
  | 'turn_end';
export type BattlePhase = 'tactic' | 'combat' | 'result';
export type CombatResult = 'win' | 'lose' | 'draw' | null;
export type CombatEventType = 'damage' | 'heal' | 'skill' | 'death' | 'miss';
export type BattleEventType = 'start' | 'tactic' | 'combat' | 'result';
export type CombatLogType = CombatEventType | BattleLogReason;
export type BattleLogReason = 'field_event';
export type StreakPackReward = 'rare' | 'hero';

export interface BattleSynergy {
  faction: Faction;
  effect: BattleSynergyEffect;
  level: BattleSynergyTier;
}

export interface WarriorCard {
  id: string;
  type: 'warrior';
  name: string;
  faction: Faction;
  grade: Grade;
  stats: WarriorStats;
  skills: Skill[];
  image?: string;
}

export type TacticStat = '지력' | '무력' | 'none';

export interface TacticCard {
  id: string;
  type: 'tactic';
  name: string;
  description: string;
  baseStat: TacticStat;
  grade: Grade;
}

export type Card = WarriorCard | TacticCard;

// ============================================================
// Owned cards (with level)
// ============================================================

export interface OwnedCard {
  instanceId: string;  // unique per owned card
  cardId: string;      // references Card.id
  level: number;
  duplicates: number;  // used for enhancement
}

// ============================================================
// Deck
// ============================================================

export interface DeckSlot {
  instanceId: string; // references OwnedCard.instanceId
  lane: Lane;
}

export interface Deck {
  id: string;
  name: string;
  warriors: DeckSlot[];  // exactly 3
  tactics: string[];     // instanceIds, exactly 2
}

// ============================================================
// Booster Pack
// ============================================================

export type PackType = 'normal' | 'rare' | 'hero' | 'legend';

export interface BoosterPack {
  id: string;
  type: PackType;
  opened: boolean;
}

// ============================================================
// Battle
// ============================================================

export interface BattleFieldEvent {
  name: string;
  description: string;
  effect: BattleFieldEffect; // describes the mechanical effect
}

export interface BattleWarrior {
  instanceId: string;
  cardId: string;
  level: number;
  lane: Lane;
  currentHp: number;
  maxHp: number;
  stats: WarriorStats; // effective stats (after buffs/debuffs)
  baseStats: WarriorStats;
  isAlive: boolean;
  statusEffects: StatusEffect[];
}

export interface StatusEffect {
  type: StatusEffectType;
  value: number;
  turnsLeft: number;
}

export interface CombatEvent {
  type: CombatEventType;
  targetInstanceId: string;
  value?: number;           // damage or heal amount
  skillName?: string;       // for skill activation display
  color?: string;           // override color for display
  isSkillDamage?: boolean;  // purple/blue for skill damage
}

export interface BattleTactic {
  instanceId: string;
  cardId: string;
  level: number;
  used: boolean;
}

// ============================================================
// Battle Actions - sequential animation steps
// ============================================================

export type BattleAction =
  | { type: 'turn_start'; turn: number }
  | { type: 'tactic_use'; side: 'player' | 'enemy'; tacticInstanceId: string; tacticCardId: TacticCardId; tacticName: string; events: CombatEvent[]; log: string[] }
  | { type: 'passive_skill'; warriorId: string; skillName: string; side: 'player' | 'enemy'; log: string[] }
  | { type: 'active_skill'; warriorId: string; skillName: string; side: 'player' | 'enemy'; events: CombatEvent[]; log: string[] }
  | { type: 'ultimate_skill'; warriorId: string; cardId: string; skillName: string; side: 'player' | 'enemy'; events: CombatEvent[]; log: string[] }
  | { type: 'attack'; attackerId: string; targetId: string; side: 'player' | 'enemy'; damage: number; events: CombatEvent[]; log: string[]; skillName?: string }
  | { type: 'stun_skip'; warriorId: string; warriorName: string; side: 'player' | 'enemy'; log: string[] }
  | { type: 'forced_skip'; warriorId: string; warriorName: string; side: 'player' | 'enemy'; reason: BattleLogReason; log: string[] }
  | { type: 'turn_end'; newTurn: number; phase: Exclude<BattlePhase, 'combat'>; result: CombatResult; log: string[] };

export interface BattleState {
  turn: number;
  maxTurns: number;
  phase: BattlePhase;
  player: {
    warriors: BattleWarrior[];
    tactics: BattleTactic[];
    selectedTactic: number | null;
  };
  enemy: {
    warriors: BattleWarrior[];
    tactics: BattleTactic[];
    selectedTactic: number | null;
  };
  fieldEvent: BattleFieldEvent;
  log: string[];
  result: CombatResult;
  combatEvents: CombatEvent[];
  activeSynergies?: (BattleSynergy & { side: 'player' | 'enemy' })[];
  ultimateTriggered?: { cardId: string; skillName: string } | null;
}

// ============================================================
// Title System
// ============================================================

export interface Title {
  id: string;
  name: string;
  description: string;
  category: 'wins' | 'collection' | 'streak';
  condition: (stats: GameState['stats'], collectionRate: number) => boolean;
}

// ============================================================
// Game State (persisted in localStorage)
// ============================================================

export interface GameState {
  initialized: boolean;
  ownedCards: OwnedCard[];
  decks: Deck[];
  activeDeckId: string | null;
  boosterPacks: BoosterPack[];
  currency: number; // for future use
  stats: {
    wins: number;
    losses: number;
    streak: number;
    maxStreak: number;
    scenariosCleared: number;
  };
  earnedTitles: string[];
  activeTitle: string | null;
}

// ============================================================
// Grade display helpers
// ============================================================

export const GRADE_LABELS: Record<Grade, string> = {
  1: '⭐',
  2: '⭐⭐',
  3: '⭐⭐⭐',
  4: '🌟',
};

export const GRADE_NAMES: Record<Grade, string> = {
  1: '일반',
  2: '희귀',
  3: '영웅',
  4: '전설',
};

export const GRADE_COLORS: Record<Grade, string> = {
  1: '#a0a0a0',
  2: '#4488ff',
  3: '#aa44ff',
  4: '#ffaa00',
};

export const FACTION_COLORS: Record<Faction, string> = {
  '위': '#3b82f6',
  '촉': '#22c55e',
  '오': '#ef4444',
  '군벌': '#a855f7',
};

export const PACK_INFO: Record<PackType, { name: string; color: string; cardCount: number; guaranteed: Grade }> = {
  normal: { name: '일반팩', color: '#22c55e', cardCount: 3, guaranteed: 1 },
  rare: { name: '희귀팩', color: '#3b82f6', cardCount: 4, guaranteed: 2 },
  hero: { name: '영웅팩', color: '#a855f7', cardCount: 5, guaranteed: 3 },
  legend: { name: '전설팩', color: '#ffaa00', cardCount: 5, guaranteed: 4 },
};

export const MAX_LEVEL: Record<Grade, number> = {
  1: 10,
  2: 15,
  3: 20,
  4: 30,
};
