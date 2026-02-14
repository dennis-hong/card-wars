import { 
  Card,
  DeckSlot,
  Faction,
  MAX_LEVEL,
  OwnedCard,
  BattleSynergy,
  BattleSynergyEffect,
  BattleSynergyTier,
  TacticCardId,
} from '@/types/game';
import { getCardById } from '@/data/cards';

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
