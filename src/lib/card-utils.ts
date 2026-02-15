import { 
  Card,
  Deck,
  DeckSlot,
  Faction,
  Grade,
  MAX_LEVEL,
  OwnedCard,
  WarriorCard,
  TacticCard,
  BattleSynergy,
  BattleSynergyEffect,
  BattleSynergyTier,
  TacticCardId,
} from '@/types/game';
import { getCardById, resolveOwnedCard } from '@/data/cards';

export type SynergyTier = BattleSynergyTier;

export interface DeckFactionSynergy extends BattleSynergy {
  count: number;
}

export const FACTION_SYNERGY_EFFECTS: Record<Faction, [BattleSynergyEffect, BattleSynergyEffect]> = {
  위: ['방어+1', '방어+2'],
  촉: ['무력+1', '무력+2'],
  오: ['지력+1', '지력+2'],
  군벌: ['통솔+1', '통솔+2'],
};

export function buildOwnedCardCounts(ownedCards: readonly OwnedCard[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const owned of ownedCards) {
    counts[owned.cardId] = (counts[owned.cardId] || 0) + 1;
  }
  return counts;
}

export function buildOwnedByCardId(ownedCards: readonly OwnedCard[]): Map<string, OwnedCard[]> {
  const grouped = new Map<string, OwnedCard[]>();
  for (const owned of ownedCards) {
    const bucket = grouped.get(owned.cardId) ?? [];
    bucket.push(owned);
    grouped.set(owned.cardId, bucket);
  }

  for (const bucket of grouped.values()) {
    bucket.sort((a, b) => b.level - a.level || b.duplicates - a.duplicates || a.instanceId.localeCompare(b.instanceId));
  }

  return grouped;
}

export function buildOwnedByInstanceId(ownedCards: readonly OwnedCard[]): Map<string, OwnedCard> {
  const byInstance = new Map<string, OwnedCard>();
  for (const owned of ownedCards) {
    byInstance.set(owned.instanceId, owned);
  }
  return byInstance;
}

export function getOwnedByInstanceId(ownedCards: readonly OwnedCard[], instanceId: string): OwnedCard | undefined {
  return ownedCards.find((owned) => owned.instanceId === instanceId);
}

export function getRepresentativeByCardId(
  ownedCards: readonly OwnedCard[],
  cardId: string,
): OwnedCard | undefined {
  return ownedCards.find((owned) => owned.cardId === cardId);
}

export function calculateEnhanceFuel(owned: OwnedCard, counts: Record<string, number>): number {
  const extraCopies = Math.max((counts[owned.cardId] || 1) - 1, 0);
  return owned.duplicates + extraCopies;
}

export function canEnhanceOwnedCard(owned: OwnedCard, counts: Record<string, number>): boolean {
  const cardData = getCardById(owned.cardId);
  if (!cardData) return false;
  if (owned.level >= MAX_LEVEL[cardData.grade]) return false;
  return calculateEnhanceFuel(owned, counts) > 0;
}

export function resolveDeckSynergies(
  warriors: readonly DeckSlot[],
  ownedByInstanceId: ReadonlyMap<string, OwnedCard>
): DeckFactionSynergy[] {
  const factions: Faction[] = [];
  for (const w of warriors) {
    const owned = ownedByInstanceId.get(w.instanceId);
    if (!owned) continue;
    const card = getCardById(owned.cardId);
    if (card?.type === 'warrior') factions.push(card.faction);
  }

  const counts: Record<string, number> = {};
  for (const faction of factions) {
    counts[faction] = (counts[faction] || 0) + 1;
  }

  const result: DeckFactionSynergy[] = [];
  for (const [faction, count] of Object.entries(counts)) {
    const effects = FACTION_SYNERGY_EFFECTS[faction as Faction];
    if (!effects) continue;

    if (count >= 3) {
      const effect = effects[1];
      if (!effect) continue;
      result.push({
        faction: faction as Faction,
        count,
        effect,
        level: 'major',
      });
      continue;
    }

    if (count >= 2) {
      const effect = effects[0];
      if (!effect) continue;
      result.push({
        faction: faction as Faction,
        count,
        effect,
        level: 'minor',
      });
    }
  }

  return result;
}

export function normalizeDeckSlots<T extends DeckSlot>(slots: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const slot of slots) {
    if (seen.has(slot.instanceId)) continue;
    seen.add(slot.instanceId);
    result.push(slot);
  }
  return result;
}

export function isOwnedInstanceId(ownedCards: readonly OwnedCard[], instanceId: string): boolean {
  return ownedCards.some((owned) => owned.instanceId === instanceId);
}

export function getTacticCardIds(): readonly TacticCardId[] {
  return ['t-fire', 't-ambush', 't-chain', 't-taunt', 't-heal', 't-buff', 't-rockfall', 't-counter'];
}

export function isTacticCardId(value: string): value is TacticCardId {
  return getTacticCardIds().includes(value as TacticCardId);
}

export function buildOwnedCardIdSet(ownedCards: readonly OwnedCard[]): Set<string> {
  return new Set(ownedCards.map((card) => card.cardId));
}

export function sortOwnedCardsByType(cards: Card[], order: ('grade' | 'name' | 'attack')[]): Card[] {
  const base = [...cards];
  base.sort((a, b) => {
    for (const key of order) {
      if (key === 'grade') {
        const diff = b.grade - a.grade;
        if (diff !== 0) return diff;
      } else if (key === 'attack') {
        const aAttack = a.type === 'warrior' ? a.stats.attack : -1;
        const bAttack = b.type === 'warrior' ? b.stats.attack : -1;
        const diff = bAttack - aAttack;
        if (diff !== 0) return diff;
      } else if (key === 'name') {
        const diff = a.name.localeCompare(b.name, 'ko');
        if (diff !== 0) return diff;
      }
    }
    return 0;
  });
  return base;
}

// ============================================================
// Deck / Ownership Validation Helpers (#11)
// ============================================================

export interface DeckValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate that all deck references point to valid owned cards */
export function validateDeck(deck: Deck, ownedCards: readonly OwnedCard[]): DeckValidationResult {
  const errors: string[] = [];
  const ownedIds = new Set(ownedCards.map((c) => c.instanceId));

  // Check warrior slots
  for (const slot of deck.warriors) {
    if (!ownedIds.has(slot.instanceId)) {
      errors.push(`무장 슬롯의 카드(${slot.instanceId})를 소유하고 있지 않습니다.`);
      continue;
    }
    const owned = ownedCards.find((c) => c.instanceId === slot.instanceId)!;
    const card = getCardById(owned.cardId);
    if (!card) {
      errors.push(`카드 데이터를 찾을 수 없습니다: ${owned.cardId}`);
    } else if (card.type !== 'warrior') {
      errors.push(`${card.name}은(는) 무장 카드가 아닙니다.`);
    }
  }

  // Check tactic slots
  for (const tid of deck.tactics) {
    if (!ownedIds.has(tid)) {
      errors.push(`전법 슬롯의 카드(${tid})를 소유하고 있지 않습니다.`);
      continue;
    }
    const owned = ownedCards.find((c) => c.instanceId === tid)!;
    const card = getCardById(owned.cardId);
    if (!card) {
      errors.push(`카드 데이터를 찾을 수 없습니다: ${owned.cardId}`);
    } else if (card.type !== 'tactic') {
      errors.push(`${card.name}은(는) 전법 카드가 아닙니다.`);
    }
  }

  // Check warrior count
  if (deck.warriors.length !== 3) {
    errors.push(`무장은 정확히 3장이어야 합니다. (현재: ${deck.warriors.length})`);
  }

  // Check tactic count
  if (deck.tactics.length > 2) {
    errors.push(`전법은 최대 2장입니다. (현재: ${deck.tactics.length})`);
  }

  // Check lane uniqueness
  const lanes = deck.warriors.map((w) => w.lane);
  if (new Set(lanes).size !== lanes.length) {
    errors.push('각 무장은 서로 다른 진영에 배치해야 합니다.');
  }

  // Check duplicate instance usage
  const allIds = [...deck.warriors.map((w) => w.instanceId), ...deck.tactics];
  if (new Set(allIds).size !== allIds.length) {
    errors.push('같은 카드를 중복 배치할 수 없습니다.');
  }

  return { valid: errors.length === 0, errors };
}

/** Remove stale references from a deck (cards no longer owned) */
export function sanitizeDeck(deck: Deck, ownedCards: readonly OwnedCard[]): Deck {
  const ownedIds = new Set(ownedCards.map((c) => c.instanceId));
  return {
    ...deck,
    warriors: deck.warriors.filter((w) => ownedIds.has(w.instanceId)),
    tactics: deck.tactics.filter((t) => ownedIds.has(t)),
  };
}

/** Resolve an owned card to its typed warrior data, or null */
export function resolveWarrior(owned: OwnedCard): { owned: OwnedCard; card: WarriorCard } | null {
  const resolved = resolveOwnedCard(owned);
  if (!resolved || resolved.card.type !== 'warrior') return null;
  return { owned: resolved.owned, card: resolved.card as WarriorCard };
}

/** Resolve an owned card to its typed tactic data, or null */
export function resolveTactic(owned: OwnedCard): { owned: OwnedCard; card: TacticCard } | null {
  const resolved = resolveOwnedCard(owned);
  if (!resolved || resolved.card.type !== 'tactic') return null;
  return { owned: resolved.owned, card: resolved.card as TacticCard };
}

/** Check if an owned card can reach higher level */
export function canLevelUp(owned: OwnedCard): boolean {
  const card = getCardById(owned.cardId);
  if (!card) return false;
  return owned.level < MAX_LEVEL[card.grade as Grade];
}
