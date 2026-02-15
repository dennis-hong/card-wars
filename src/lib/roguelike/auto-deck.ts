import { Card, Deck, Lane, OwnedCard } from '@/types/game';
import { getCardById } from '@/data/cards';

interface CandidateWarrior {
  owned: OwnedCard;
  card: Extract<Card, { type: 'warrior' }>;
}

interface CandidateTactic {
  owned: OwnedCard;
  card: Extract<Card, { type: 'tactic' }>;
}

function totalWarriorStats(candidate: CandidateWarrior): number {
  const s = candidate.card.stats;
  return s.attack + s.command + s.intel + s.defense;
}

function pickTopWarriors(inventory: OwnedCard[]): CandidateWarrior[] {
  const warriors = inventory
    .map((owned) => {
      const card = getCardById(owned.cardId);
      if (!card || card.type !== 'warrior') {
        return null;
      }

      return { owned, card };
    })
    .filter((entry): entry is CandidateWarrior => entry !== null);

  warriors.sort((a, b) => {
    const gradeGap = b.card.grade - a.card.grade;
    if (gradeGap !== 0) return gradeGap;

    const statGap = totalWarriorStats(b) - totalWarriorStats(a);
    if (statGap !== 0) return statGap;

    if (b.owned.level !== a.owned.level) {
      return b.owned.level - a.owned.level;
    }

    return b.owned.instanceId.localeCompare(a.owned.instanceId);
  });

  return warriors.slice(0, 3);
}

function pickTactics(inventory: OwnedCard[]): CandidateTactic[] {
  const tactics = inventory
    .map((owned) => {
      const card = getCardById(owned.cardId);
      if (!card || card.type !== 'tactic') {
        return null;
      }

      return { owned, card };
    })
    .filter((entry): entry is CandidateTactic => entry !== null);

  tactics.sort((a, b) => {
    const gradeGap = b.card.grade - a.card.grade;
    if (gradeGap !== 0) return gradeGap;

    if (b.owned.level !== a.owned.level) {
      return b.owned.level - a.owned.level;
    }

    return b.owned.instanceId.localeCompare(a.owned.instanceId);
  });

  return tactics;
}

function assignLanes(warriors: CandidateWarrior[]) {
  const [first, second, third] = [...warriors];
  if (!first || !second || !third) {
    return null;
  }

  const byAttack = [...warriors].sort(
    (a, b) => b.card.stats.attack - a.card.stats.attack
  );
  const byIntel = [...warriors].sort(
    (a, b) => b.card.stats.intel - a.card.stats.intel
  );

  const frontWarrior = byAttack[0];
  const backWarrior = byIntel.find((item) => item.owned.instanceId !== frontWarrior.owned.instanceId)
    ?? second;
  const used = new Set([frontWarrior.owned.instanceId, backWarrior.owned.instanceId]);
  const midWarrior = warriors.find((item) => !used.has(item.owned.instanceId)) ?? third;

  const lanes: Record<Lane, string> = {
    front: frontWarrior.owned.instanceId,
    mid: midWarrior.owned.instanceId,
    back: backWarrior.owned.instanceId,
  };

  return lanes;
}

export function buildAutoDeckFromInventory(
  inventory: OwnedCard[],
  options?: {
    deckId?: string;
    deckName?: string;
  }
): Deck | null {
  const warriors = pickTopWarriors(inventory);
  if (warriors.length < 3) {
    return null;
  }

  const lanes = assignLanes(warriors);
  if (!lanes) {
    return null;
  }

  const tactics = pickTactics(inventory).slice(0, 2).map((entry) => entry.owned.instanceId);

  return {
    id: options?.deckId || warriors[0].owned.instanceId,
    name: options?.deckName || '권장 편성',
    warriors: [
      { instanceId: lanes.front, lane: 'front' },
      { instanceId: lanes.mid, lane: 'mid' },
      { instanceId: lanes.back, lane: 'back' },
    ],
    tactics,
  };
}
