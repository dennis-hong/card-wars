import { Deck, OwnedCard, PackType, CombatResult, Lane } from '@/types/game';

export type RunAct = 1 | 2 | 3;
export type RunNodeType = 'battle' | 'elite' | 'event' | 'shop' | 'rest' | 'boss';
export type RunNodeId = string;

export interface RoguelikeMapNode {
  id: RunNodeId;
  act: RunAct;
  column: number;
  row: number;
  type: RunNodeType;
  visited: boolean;
  enemy?: RunEnemyTemplate;
  eventId?: string;
}

export interface RoguelikeMapEdge {
  from: RunNodeId;
  to: RunNodeId;
}

export interface RoguelikeMap {
  act: RunAct;
  columns: number;
  nodes: RoguelikeMapNode[];
  edges: RoguelikeMapEdge[];
  startNodeId: RunNodeId;
  bossNodeId: RunNodeId;
}

export interface RunEnemyTemplate {
  warriors: {
    cardId: string;
    level: number;
    lane: Lane;
  }[];
  ownedCards: OwnedCard[];
  tactics?: {
    cardId: string;
    level: number;
  }[];
  packReward: PackType;
  rewardGoldMin: number;
  rewardGoldMax: number;
  relicChoices: string[];
}

export interface RunEventChoice {
  id: string;
  title: string;
  description: string;
  effects: RunEventEffect[];
}

export interface RunEventDefinition {
  id: string;
  title: string;
  flavor: string;
  icon: string;
  choices: RunEventChoice[];
}

export type RunEventEffectType = 'gold' | 'hp' | 'card' | 'relic' | 'removeCard';

export interface RunEventEffect {
  type: RunEventEffectType;
  value?: number;
  cardId?: string;
  relicId?: string;
}

export interface RunShopItem {
  id: string;
  label: string;
  price: number;
  type: 'relic' | 'heal' | 'restore' | 'remove' | 'card';
  cardId?: string;
  relicId?: string;
}

export interface RunRewardPayload {
  sourceNodeId: RunNodeId;
  sourceType: RunNodeType;
  packType: PackType;
  gold: number;
  packOpened?: boolean;
  relicOptions: string[];
  bossRelic?: string;
}

export interface RunStats {
  battlesWon: number;
  elitesCleared: number;
  goldEarned: number;
  cardsObtained: number;
  battlesFought: number;
  playTimeMs: number;
  lastBattleResult: CombatResult | null;
}

export type RunPhase =
  | 'idle'
  | 'opening'
  | 'deck_build'
  | 'running'
  | 'reward'
  | 'event'
  | 'shop'
  | 'rest'
  | 'battle'
  | 'ended';

export interface RunState {
  stateVersion: 1;
  runId: string;
  startedAt: number;
  updatedAt: number;
  currentAct: RunAct;
  phase: RunPhase;
  deck: Deck;
  relics: string[];
  teamHp: number;
  maxTeamHp: number;
  gold: number;
  inventory: OwnedCard[];
  map: RoguelikeMap | null;
  currentNodeId: RunNodeId | null;
  visitedNodes: RunNodeId[];
  openedStarterPacks: { id: string; type: PackType; opened: boolean }[];
  pendingReward: RunRewardPayload | null;
  pendingEventId: string | null;
  pendingShopItems: RunShopItem[];
  stats: RunStats;
  result: 'win' | 'loss' | null;
}

export const MAX_RELIC_SLOTS = 3;
