import { Deck, OwnedCard, PackType } from '@/types/game';
import { generateId } from '@/lib/uuid';
import { getCardById } from '@/data/cards';
import {
  RunEnemyTemplate,
  RunEventDefinition,
  RunEventEffect,
  RunEventChoice,
  RunNodeId,
  RunNodeType,
  RunRewardPayload,
  RunState,
  RunStats,
  RunAct,
  RoguelikeMap,
  RoguelikeMapEdge,
  RoguelikeMapNode,
  RunShopItem,
  RunPhase,
} from '@/lib/roguelike/run-types';

const STORAGE_KEY = 'cardwars_roguelike_v1';
const STORAGE_VERSION = 1;

export interface RunStorageEnvelope {
  version: number;
  state: Omit<RunState, 'stateVersion' | 'updatedAt'>;
}

const EMPTY_STATS: RunStats = {
  battlesWon: 0,
  elitesCleared: 0,
  goldEarned: 0,
  relicsCollected: 0,
  cardsObtained: 0,
  battlesFought: 0,
  playTimeMs: 0,
  floorsCleared: 0,
  lastBattleResult: null,
};

function clampInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

function normalizeLane(value: unknown): 'front' | 'mid' | 'back' | null {
  return value === 'front' || value === 'mid' || value === 'back' ? value : null;
}

function normalizeRunNodeType(value: unknown): RunNodeType {
  if (
    value === 'battle'
    || value === 'elite'
    || value === 'event'
    || value === 'shop'
    || value === 'rest'
    || value === 'boss'
  ) {
    return value;
  }
  return 'battle';
}

function isPackType(value: unknown): value is PackType {
  return value === 'normal' || value === 'rare' || value === 'hero' || value === 'legend';
}

function normalizeAct(value: unknown): RunAct {
  const n = clampInt(value, 1);
  return n === 2 || n === 3 ? n : 1;
}

function normalizeOwnedCard(raw: unknown): OwnedCard | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as { instanceId?: unknown; cardId?: unknown; level?: unknown; duplicates?: unknown };
  const instanceId = typeof candidate.instanceId === 'string' ? candidate.instanceId : '';
  const cardId = typeof candidate.cardId === 'string' ? candidate.cardId : '';
  if (!instanceId || !cardId || !getCardById(cardId)) return null;
  return {
    instanceId,
    cardId,
    level: Math.max(1, clampInt(candidate.level, 1)),
    duplicates: Math.max(0, clampInt(candidate.duplicates, 0)),
  };
}

function normalizeDeck(raw: unknown): Deck {
  if (!raw || typeof raw !== 'object') {
    return { id: generateId(), name: '원정대', warriors: [], tactics: [] };
  }
  const candidate = raw as { id?: unknown; name?: unknown; warriors?: unknown; tactics?: unknown };
  const id = typeof candidate.id === 'string' && candidate.id ? candidate.id : generateId();
  const name = typeof candidate.name === 'string' && candidate.name ? candidate.name : '원정대';

  const warriors = Array.isArray(candidate.warriors)
    ? candidate.warriors
      .map((slot) => {
        if (!slot || typeof slot !== 'object') return null;
        const s = slot as { instanceId?: unknown; lane?: unknown };
        const lane = normalizeLane(s.lane);
        if (typeof s.instanceId !== 'string' || !lane) return null;
        return { instanceId: s.instanceId, lane };
      })
      .filter((slot): slot is { instanceId: string; lane: 'front' | 'mid' | 'back' } => slot !== null)
    : [];

  const tactics = Array.isArray(candidate.tactics)
    ? candidate.tactics
      .map((slot) => (typeof slot === 'string' ? slot : null))
      .filter((slot): slot is string => slot !== null)
    : [];

  return {
    id,
    name,
    warriors,
    tactics,
  };
}

function normalizeEnemyTemplate(raw: unknown): RunEnemyTemplate | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const candidate = raw as {
    warriors?: unknown;
    tactics?: unknown;
    ownedCards?: unknown;
    packReward?: unknown;
    rewardGoldMin?: unknown;
    rewardGoldMax?: unknown;
    relicChoices?: unknown;
  };

  if (!Array.isArray(candidate.warriors)) return undefined;

  const warriors = candidate.warriors
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const e = entry as { cardId?: unknown; lane?: unknown; level?: unknown };
      const cardId = typeof e.cardId === 'string' ? e.cardId : '';
      const lane = normalizeLane(e.lane);
      if (!cardId || !lane || !getCardById(cardId)) return null;
      return {
        cardId,
        lane,
        level: Math.max(1, clampInt(e.level, 1)),
      };
    })
    .filter((entry): entry is { cardId: string; lane: 'front' | 'mid' | 'back'; level: number } => entry !== null);

  if (warriors.length === 0) return undefined;

  const tactics = Array.isArray(candidate.tactics)
    ? candidate.tactics
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const t = entry as { cardId?: unknown; level?: unknown };
        if (typeof t.cardId !== 'string' || !getCardById(t.cardId)) return null;
        return {
          cardId: t.cardId,
          level: Math.max(1, clampInt(t.level, 1)),
        };
      })
      .filter((entry): entry is { cardId: string; level: number } => entry !== null)
    : undefined;

  const ownedCards = Array.isArray(candidate.ownedCards)
    ? candidate.ownedCards
      .map((item) => normalizeOwnedCard(item))
      .filter(Boolean) as OwnedCard[]
    : [];

  const packReward = isPackType(candidate.packReward) ? candidate.packReward : 'normal';
  const rewardGoldMin = Math.max(0, clampInt(candidate.rewardGoldMin, 10));
  const rewardGoldMax = Math.max(rewardGoldMin, clampInt(candidate.rewardGoldMax, rewardGoldMin));

  return {
    warriors,
    ownedCards,
    tactics,
    packReward,
    rewardGoldMin,
    rewardGoldMax,
    relicChoices: Array.isArray(candidate.relicChoices)
      ? candidate.relicChoices.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

function normalizeMapNode(raw: unknown): RoguelikeMapNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as {
    id?: unknown;
    act?: unknown;
    column?: unknown;
    row?: unknown;
    type?: unknown;
    visited?: unknown;
    enemy?: unknown;
    eventId?: unknown;
  };

  const id = typeof candidate.id === 'string' && candidate.id ? candidate.id : '';
  if (!id) return null;

  return {
    id,
    act: normalizeAct(candidate.act),
    column: Math.max(0, clampInt(candidate.column, 0)),
    row: Math.max(0, clampInt(candidate.row, 0)),
    type: normalizeRunNodeType(candidate.type),
    visited: Boolean(candidate.visited),
    enemy: normalizeEnemyTemplate(candidate.enemy),
    eventId: typeof candidate.eventId === 'string' ? candidate.eventId : undefined,
  };
}

function normalizeMapEdge(raw: unknown): RoguelikeMapEdge | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as { from?: unknown; to?: unknown };
  const from = typeof candidate.from === 'string' && candidate.from ? candidate.from : '';
  const to = typeof candidate.to === 'string' && candidate.to ? candidate.to : '';
  if (!from || !to) return null;
  return { from, to };
}

function normalizeMap(raw: unknown): RoguelikeMap | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as {
    act?: unknown;
    columns?: unknown;
    nodes?: unknown;
    edges?: unknown;
    startNodeId?: unknown;
    bossNodeId?: unknown;
  };

  const act = normalizeAct(candidate.act);
  const columns = Math.max(8, Math.min(14, clampInt(candidate.columns, 8)));
  const startNodeId = typeof candidate.startNodeId === 'string' ? candidate.startNodeId : '';
  const bossNodeId = typeof candidate.bossNodeId === 'string' ? candidate.bossNodeId : '';

  const nodes = Array.isArray(candidate.nodes)
    ? candidate.nodes.map((node) => normalizeMapNode(node)).filter((node): node is RoguelikeMapNode => node !== null)
    : [];

  const edges = Array.isArray(candidate.edges)
    ? candidate.edges.map((edge) => normalizeMapEdge(edge)).filter((edge): edge is RoguelikeMapEdge => edge !== null)
    : [];

  if (!startNodeId || !bossNodeId || nodes.length < 2) {
    return null;
  }

  return {
    act,
    columns,
    nodes,
    edges,
    startNodeId,
    bossNodeId,
  };
}

function normalizeRewards(raw: unknown): RunRewardPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as {
    sourceNodeId?: unknown;
    sourceType?: unknown;
    packType?: unknown;
    gold?: unknown;
    relicOptions?: unknown;
    bossRelic?: unknown;
  };

  const sourceNodeId = typeof candidate.sourceNodeId === 'string' ? candidate.sourceNodeId : '';
  if (!sourceNodeId) return null;
  const sourceType = normalizeRunNodeType(candidate.sourceType);
  if (sourceType !== 'battle' && sourceType !== 'elite' && sourceType !== 'boss') return null;
  if (!isPackType(candidate.packType)) return null;
  if (!Number.isFinite(Number(candidate.gold))) return null;

  return {
    sourceNodeId,
    sourceType,
    packType: candidate.packType,
    gold: Math.max(0, clampInt(candidate.gold, 0)),
    relicOptions: Array.isArray(candidate.relicOptions)
      ? candidate.relicOptions.filter((id): id is string => typeof id === 'string')
      : [],
    bossRelic: typeof candidate.bossRelic === 'string' ? candidate.bossRelic : undefined,
  };
}

function normalizeEvent(raw: unknown): RunEventDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as {
    id?: unknown;
    title?: unknown;
    flavor?: unknown;
    icon?: unknown;
    choices?: unknown;
  };

  if (typeof candidate.id !== 'string') return null;
  if (!Array.isArray(candidate.choices)) return null;

  const choices = candidate.choices
    .map((rawChoice) => {
      if (!rawChoice || typeof rawChoice !== 'object') return null;
      const c = rawChoice as {
        id?: unknown;
        title?: unknown;
        description?: unknown;
        effects?: unknown;
      };
      if (typeof c.id !== 'string') return null;

      const effects = Array.isArray(c.effects)
        ? c.effects
          .map((rawEffect) => {
            if (!rawEffect || typeof rawEffect !== 'object') return null;
            const e = rawEffect as {
              type?: unknown;
              value?: unknown;
              cardId?: unknown;
              relicId?: unknown;
            };
            const type =
              e.type === 'gold' || e.type === 'hp' || e.type === 'card' || e.type === 'relic' || e.type === 'removeCard'
                ? e.type
                : null;
            if (!type) return null;
            return {
              type,
              value: e.value !== undefined ? clampInt(e.value, 0) : undefined,
              cardId: typeof e.cardId === 'string' ? e.cardId : undefined,
              relicId: typeof e.relicId === 'string' ? e.relicId : undefined,
            } as RunEventEffect;
          })
          .filter((effect): effect is RunEventEffect => effect !== null)
        : [];

      return {
        id: c.id,
        title: typeof c.title === 'string' ? c.title : '선택',
        description: typeof c.description === 'string' ? c.description : '',
        effects,
      };
    })
    .filter((choice): choice is RunEventChoice => choice !== null);

  return {
    id: candidate.id,
    title: typeof candidate.title === 'string' ? candidate.title : '이벤트',
    flavor: typeof candidate.flavor === 'string' ? candidate.flavor : '',
    icon: typeof candidate.icon === 'string' ? candidate.icon : '🗡️',
    choices,
  };
}

function normalizeShopItems(raw: unknown): RunShopItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((rawItem) => {
      if (!rawItem || typeof rawItem !== 'object') return null;
      const i = rawItem as {
        id?: unknown;
        label?: unknown;
        price?: unknown;
        type?: unknown;
        cardId?: unknown;
        relicId?: unknown;
      };
      if (typeof i.id !== 'string' || !i.id) return null;
      const type =
        i.type === 'relic' || i.type === 'heal' || i.type === 'restore' || i.type === 'remove' || i.type === 'card'
          ? i.type
          : null;
      if (!type) return null;
      return {
        id: i.id,
        label: typeof i.label === 'string' ? i.label : '아이템',
        price: Math.max(0, clampInt(i.price, 0)),
        type,
        cardId: typeof i.cardId === 'string' ? i.cardId : undefined,
        relicId: typeof i.relicId === 'string' ? i.relicId : undefined,
      } as RunShopItem;
    })
    .filter((item): item is RunShopItem => item !== null);
}

function normalizePhase(value: unknown): RunPhase {
  if (
    value === 'opening'
    || value === 'deck_build'
    || value === 'running'
    || value === 'reward'
    || value === 'event'
    || value === 'shop'
    || value === 'rest'
    || value === 'battle'
    || value === 'ended'
  ) {
    return value;
  }
  if (value === 'idle') return value;
  return 'idle';
}

function sanitizeRunState(raw: unknown): RunState {
  if (!raw || typeof raw !== 'object') {
    return createEmptyRunState();
  }

  const candidate = raw as {
    runId?: unknown;
    startedAt?: unknown;
    updatedAt?: unknown;
    currentAct?: unknown;
    phase?: unknown;
    deck?: unknown;
    relics?: unknown;
    gold?: unknown;
    inventory?: unknown;
    map?: unknown;
    currentNodeId?: unknown;
    visitedNodes?: unknown;
    openedStarterPacks?: unknown;
    pendingReward?: unknown;
    pendingEventId?: unknown;
    pendingShopItems?: unknown;
    stats?: unknown;
    result?: unknown;
  };

  const now = Date.now();
  const startedAt = Number.isFinite(Number(candidate.startedAt)) ? clampInt(candidate.startedAt, now) : now;
  const updatedAt = Number.isFinite(Number(candidate.updatedAt)) ? clampInt(candidate.updatedAt, now) : now;

  const statsRaw = (candidate.stats && typeof candidate.stats === 'object') ? candidate.stats as Record<string, unknown> : {};
  const stats: RunStats = {
    ...EMPTY_STATS,
    battlesWon: clampInt(statsRaw.battlesWon, 0),
    elitesCleared: clampInt(statsRaw.elitesCleared, 0),
    goldEarned: clampInt(statsRaw.goldEarned, 0),
    relicsCollected: clampInt(statsRaw.relicsCollected, 0),
    cardsObtained: clampInt(statsRaw.cardsObtained, 0),
    battlesFought: clampInt(statsRaw.battlesFought, 0),
    playTimeMs: clampInt(statsRaw.playTimeMs, 0),
    floorsCleared: clampInt(statsRaw.floorsCleared, 0),
    lastBattleResult:
      statsRaw.lastBattleResult === 'win' || statsRaw.lastBattleResult === 'lose' || statsRaw.lastBattleResult === 'draw'
        ? statsRaw.lastBattleResult
        : null,
  };

  const openedStarterPacks = Array.isArray(candidate.openedStarterPacks)
    ? candidate.openedStarterPacks
      .map((packRaw) => {
        if (!packRaw || typeof packRaw !== 'object') return null;
        const p = packRaw as { id?: unknown; type?: unknown; opened?: unknown };
        const id = typeof p.id === 'string' && p.id ? p.id : '';
        if (!id || !isPackType(p.type)) return null;
        return { id, type: p.type, opened: Boolean(p.opened) };
      })
      .filter((pack): pack is { id: string; type: PackType; opened: boolean } => pack !== null)
    : [];

  return {
    stateVersion: STORAGE_VERSION,
    runId: typeof candidate.runId === 'string' && candidate.runId ? candidate.runId : generateId(),
    startedAt,
    updatedAt,
    currentAct: normalizeAct(candidate.currentAct),
    phase: normalizePhase(candidate.phase),
    deck: normalizeDeck(candidate.deck),
    relics: Array.isArray(candidate.relics)
      ? candidate.relics.filter((relic): relic is string => typeof relic === 'string')
      : [],
    gold: Math.max(0, clampInt(candidate.gold, 0)),
    inventory: Array.isArray(candidate.inventory)
      ? candidate.inventory.map((item) => normalizeOwnedCard(item)).filter(Boolean) as OwnedCard[]
      : [],
    map: normalizeMap(candidate.map),
    currentNodeId: typeof candidate.currentNodeId === 'string' ? candidate.currentNodeId : null,
    visitedNodes: Array.isArray(candidate.visitedNodes)
      ? candidate.visitedNodes.filter((id): id is RunNodeId => typeof id === 'string')
      : [],
    openedStarterPacks,
    pendingReward: normalizeRewards(candidate.pendingReward),
    pendingEventId: typeof candidate.pendingEventId === 'string' ? candidate.pendingEventId : null,
    pendingShopItems: normalizeShopItems(candidate.pendingShopItems),
    stats,
    result:
      candidate.result === 'win' || candidate.result === 'loss' ? candidate.result : null,
  };
}

export function createEmptyRunState(): RunState {
  const now = Date.now();
  return {
    stateVersion: STORAGE_VERSION,
    runId: generateId(),
    startedAt: now,
    updatedAt: now,
    currentAct: 1,
    phase: 'idle',
    deck: { id: generateId(), name: '원정대', warriors: [], tactics: [] },
    relics: [],
    gold: 0,
    inventory: [],
    map: null,
    currentNodeId: null,
    visitedNodes: [],
    openedStarterPacks: [],
    pendingReward: null,
    pendingEventId: null,
    pendingShopItems: [],
    stats: { ...EMPTY_STATS },
    result: null,
  };
}

export function loadRunState(): RunState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { version?: unknown; state?: unknown };
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version && parsed.version !== STORAGE_VERSION && typeof parsed.version !== 'number') {
      return sanitizeRunState(parsed.state);
    }
    return sanitizeRunState(parsed.state);
  } catch {
    return null;
  }
}

export function saveRunState(state: RunState): void {
  if (typeof window === 'undefined') return;

  const payload: RunStorageEnvelope = {
    version: STORAGE_VERSION,
    state: {
      ...state,
    },
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

export function clearRunState(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export { normalizeEvent, normalizeEnemyTemplate };
