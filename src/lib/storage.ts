import { Deck, GameState, OwnedCard } from '@/types/game';
import { getCardById } from '@/data/cards';
import { generateId } from '@/lib/uuid';

const STORAGE_KEY = 'cardwars_save';
export const GAME_STATE_VERSION = 3;

export interface PersistedGameStateEnvelope {
  version: number;
  checksum?: string;
}

type RawGameState = Partial<{
  initialized: boolean;
  ownedCards: unknown;
  decks: unknown;
  activeDeckId: string | null;
  boosterPacks: unknown;
  currency: number;
  stats: {
    wins: unknown;
    losses: unknown;
    streak: unknown;
    maxStreak: unknown;
    scenariosCleared: unknown;
  };
  earnedTitles: unknown;
  activeTitle: unknown;
  version: unknown;
}>;

type RawDeck = {
  id: unknown;
  name: unknown;
  warriors: unknown;
  tactics: unknown;
};

const EMPTY_STATS = {
  wins: 0,
  losses: 0,
  streak: 0,
  maxStreak: 0,
  scenariosCleared: 0,
};

function isPackType(value: unknown): value is 'normal' | 'rare' | 'hero' | 'legend' {
  return value === 'normal' || value === 'rare' || value === 'hero' || value === 'legend';
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function clampInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function normalizeStats(raw: unknown): typeof EMPTY_STATS {
  const source = raw && typeof raw === 'object' ? raw as { wins?: unknown; losses?: unknown; streak?: unknown; maxStreak?: unknown; scenariosCleared?: unknown } : {};
  return {
    wins: clampInt(source.wins, EMPTY_STATS.wins),
    losses: clampInt(source.losses, EMPTY_STATS.losses),
    streak: clampInt(source.streak, EMPTY_STATS.streak),
    maxStreak: clampInt(source.maxStreak, EMPTY_STATS.maxStreak),
    scenariosCleared: clampInt(source.scenariosCleared, EMPTY_STATS.scenariosCleared),
  };
}

function calculateChecksum(state: GameState): string {
  const payload = {
    ...state,
    version: GAME_STATE_VERSION,
  };
  const json = JSON.stringify(payload);
  let hash = 2166136261;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function createInitialState(): GameState {
  return {
    initialized: false,
    ownedCards: [],
    decks: [],
    activeDeckId: null,
    boosterPacks: [
      { id: generateId(), type: 'normal', opened: false },
      { id: generateId(), type: 'normal', opened: false },
      { id: generateId(), type: 'rare', opened: false },
    ],
    currency: 0,
    stats: { ...EMPTY_STATS },
    earnedTitles: [],
    activeTitle: null,
  };
}

function normalizeOwnedCards(rawOwned: unknown): OwnedCard[] {
  if (!Array.isArray(rawOwned)) return [];
  return rawOwned
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as {
        instanceId?: unknown;
        cardId?: unknown;
        level?: unknown;
        duplicates?: unknown;
      };
      const instanceId = typeof candidate.instanceId === 'string' ? candidate.instanceId : null;
      const cardId = typeof candidate.cardId === 'string' ? candidate.cardId : null;
      if (!instanceId || !cardId) return null;
      if (!getCardById(cardId)) return null;
      const level = Number(candidate.level);
      const duplicates = Number(candidate.duplicates);
      return {
        instanceId,
        cardId,
        level: Number.isFinite(level) && level > 0 ? Math.floor(level) : 1,
        duplicates: Number.isFinite(duplicates) && duplicates >= 0 ? Math.floor(duplicates) : 0,
      };
    })
    .filter((card): card is OwnedCard => card !== null);
}

function normalizeDeck(rawDeck: unknown): Deck | null {
  if (!rawDeck || typeof rawDeck !== 'object') return null;
  const d = rawDeck as RawDeck;
  if (typeof d.id !== 'string' || typeof d.name !== 'string') return null;

  const warriorsSource = Array.isArray(d.warriors) ? d.warriors : [];
  const tacticsSource = Array.isArray(d.tactics) ? d.tactics : [];

  const warriors = warriorsSource
    .map((slot) => {
      if (!slot || typeof slot !== 'object') return null;
      const item = slot as { instanceId?: unknown; lane?: unknown };
      const instanceId = typeof item.instanceId === 'string' ? item.instanceId : null;
      const lane = item.lane === 'front' || item.lane === 'mid' || item.lane === 'back'
        ? item.lane
        : null;
      if (!instanceId || !lane) return null;
      return { instanceId, lane };
    })
    .filter((slot): slot is Deck['warriors'][number] => slot !== null);

  const tactics = tacticsSource.filter((slot): slot is string => typeof slot === 'string');

  return {
    id: d.id,
    name: d.name,
    warriors,
    tactics,
  };
}

function sanitizeDecks(rawDecks: unknown): Deck[] {
  if (!Array.isArray(rawDecks)) return [];
  return rawDecks
    .map((rawDeck) => normalizeDeck(rawDeck))
    .filter((deck): deck is Deck => deck !== null);
}

function sanitizeBoosterPacks(rawPacks: unknown) {
  if (!Array.isArray(rawPacks)) return [];
  return rawPacks
    .map((pack) => {
      if (!pack || typeof pack !== 'object') return null;
      const candidate = pack as {
        id?: unknown;
        type?: unknown;
        opened?: unknown;
      };
      if (typeof candidate.id !== 'string') return null;
      const type = isPackType(candidate.type) ? candidate.type : 'normal';
      if (!type) return null;

      const opened = typeof candidate.opened === 'boolean' ? candidate.opened : false;
      return {
        id: candidate.id,
        type,
        opened,
      };
    })
    .filter(Boolean) as Array<{ id: string; type: 'normal' | 'rare' | 'hero' | 'legend'; opened: boolean }>;
}

type PersistedStatePayload = Partial<RawGameState & PersistedGameStateEnvelope>;

function cleanDeckReferences(decks: Deck[], ownedCards: OwnedCard[]): Deck[] {
  const ownedIds = new Set(ownedCards.map((c) => c.instanceId));
  return decks.map((deck) => ({
    ...deck,
    warriors: deck.warriors.filter((slot) => ownedIds.has(slot.instanceId)),
    tactics: deck.tactics.filter((slot) => ownedIds.has(slot)),
  }));
}

function normalizeState(raw: RawGameState, version: number): GameState {
  const ownedCards = normalizeOwnedCards(raw.ownedCards);
  const cleanedDecks = cleanDeckReferences(sanitizeDecks(raw.decks), ownedCards);
  const activeDeckId = typeof raw.activeDeckId === 'string'
    ? raw.activeDeckId
    : raw.activeDeckId === null
      ? null
      : null;

  const stats = normalizeStats(raw.stats);

  const earnedTitles = Array.isArray(raw.earnedTitles)
    ? raw.earnedTitles.filter((title): title is string => typeof title === 'string')
    : [];

  const activeTitle = normalizeString(raw.activeTitle) || null;
  const safeActiveTitle = activeTitle && earnedTitles.includes(activeTitle) ? activeTitle : null;
  const initialized = Boolean(raw.initialized);
  const currency = clampInt(raw.currency, 0);

  const state = createInitialState();

  if (version >= 2) {
    state.stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
  }

  return {
    ...state,
    initialized,
    ownedCards,
    decks: cleanedDecks,
    activeDeckId,
    boosterPacks: sanitizeBoosterPacks(raw.boosterPacks),
    currency,
    stats,
    earnedTitles,
    activeTitle: safeActiveTitle,
  };
}

function parseStatePayload(raw: string | null): PersistedStatePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as PersistedStatePayload;
  } catch {
    return null;
  }
}

export function migrateState(parsed: unknown): GameState {
  if (!parsed || typeof parsed !== 'object') return createInitialState();

  const raw = parsed as RawGameState & { version?: number };
  const version = Number.isFinite(Number(raw.version))
    ? Math.max(1, Math.floor(Number(raw.version)))
    : 1;

  const normalized = normalizeState(raw, version);
  if (version < GAME_STATE_VERSION) {
    // Migration hook for future fields
    return {
      ...normalized,
      initialized: normalized.initialized,
    };
  }
  return normalized;
}

export function loadState(): GameState {
  if (typeof window === 'undefined') return createInitialState();
  const parsed = parseStatePayload(window.localStorage.getItem(STORAGE_KEY));
  if (!parsed) return createInitialState();

  const migrated = migrateState(parsed);
  const checksum = typeof parsed.checksum === 'string' ? parsed.checksum : '';
  const expected = calculateChecksum(migrated);
  if (checksum && checksum !== expected) {
    return createInitialState();
  }

  return migrated;
}

export function saveState(state: GameState): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      ...state,
      version: GAME_STATE_VERSION,
      checksum: calculateChecksum(state),
    } as Omit<GameState, never> & PersistedGameStateEnvelope;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

export { STORAGE_KEY };
