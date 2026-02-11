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

export interface WarriorCard {
  id: string;
  type: 'warrior';
  name: string;
  faction: Faction;
  grade: Grade;
  stats: WarriorStats;
  skills: Skill[];
}

export type TacticStat = '지력' | '무력' | 'none';

export interface TacticCard {
  id: string;
  type: 'tactic';
  name: string;
  emoji: string;
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
  effect: string; // describes the mechanical effect
}

export interface BattleWarrior {
  instanceId: string;
  cardId: string;
  lane: Lane;
  currentHp: number;
  maxHp: number;
  stats: WarriorStats; // effective stats (after buffs/debuffs)
  baseStats: WarriorStats;
  isAlive: boolean;
  statusEffects: StatusEffect[];
}

export interface StatusEffect {
  type: 'stun' | 'defense_up' | 'attack_up' | 'intel_down' | 'defense_stack' | 'evasion' | 'taunt' | 'command_down';
  value: number;
  turnsLeft: number;
}

export interface CombatEvent {
  type: 'damage' | 'heal' | 'skill' | 'death' | 'miss';
  targetInstanceId: string;
  value?: number;           // damage or heal amount
  skillName?: string;       // for skill activation display
  color?: string;           // override color for display
  isSkillDamage?: boolean;  // purple/blue for skill damage
}

// ============================================================
// Battle Actions - sequential animation steps
// ============================================================

export type BattleAction =
  | { type: 'turn_start'; turn: number }
  | { type: 'tactic_use'; side: 'player' | 'enemy'; tacticName: string; tacticEmoji: string; events: CombatEvent[]; log: string[] }
  | { type: 'passive_skill'; warriorId: string; skillName: string; side: 'player' | 'enemy'; log: string[] }
  | { type: 'ultimate_skill'; warriorId: string; cardId: string; skillName: string; side: 'player' | 'enemy'; events: CombatEvent[]; log: string[] }
  | { type: 'attack'; attackerId: string; targetId: string; side: 'player' | 'enemy'; damage: number; events: CombatEvent[]; log: string[]; skillName?: string }
  | { type: 'stun_skip'; warriorId: string; warriorName: string; side: 'player' | 'enemy'; log: string[] }
  | { type: 'turn_end'; newTurn: number; phase: 'tactic' | 'result'; result: 'win' | 'lose' | 'draw' | null; log: string[] };

export interface BattleState {
  turn: number;
  maxTurns: number;
  phase: 'tactic' | 'combat' | 'result';
  player: {
    warriors: BattleWarrior[];
    tactics: { instanceId: string; cardId: string; used: boolean }[];
    selectedTactic: number | null;
  };
  enemy: {
    warriors: BattleWarrior[];
    tactics: { instanceId: string; cardId: string; used: boolean }[];
    selectedTactic: number | null;
  };
  fieldEvent: BattleFieldEvent;
  log: string[];
  result: 'win' | 'lose' | 'draw' | null;
  combatEvents: CombatEvent[];
  activeSynergies?: { faction: string; effect: string }[];
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
