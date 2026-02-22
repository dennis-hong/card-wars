import { WARRIOR_CARDS, TACTIC_CARDS } from '@/data/cards';
import { getRelicList } from '@/lib/roguelike/relics';
import { DeterministicRandom } from '@/lib/rng';

const DEFAULT_RANDOM: DeterministicRandom = { next: Math.random };

function shuffleByRandom<T>(items: readonly T[], random: DeterministicRandom): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export type ShopItemType = 'card' | 'relic' | 'restore' | 'remove';

export interface ShopItem {
  id: string;
  label: string;
  type: ShopItemType;
  price: number;
  cardId?: string;
  relicId?: string;
}

export function buildShopInventory(random: DeterministicRandom = DEFAULT_RANDOM): ShopItem[] {
  const warriors = shuffleByRandom(WARRIOR_CARDS, random).slice(0, 3);
  const tactics = shuffleByRandom(TACTIC_CARDS, random).slice(0, 2);
  const relics = shuffleByRandom(getRelicList(), random).slice(0, 1);

  const items: ShopItem[] = [];

  for (const card of warriors) {
    const grade = card.grade;
    const price = grade === 1 ? 30 : grade === 2 ? 70 : grade === 3 ? 120 : 220;
    items.push({
      id: `warrior-${card.id}`,
      label: card.name,
      type: 'card',
      price,
      cardId: card.id,
    });
  }

  for (const card of tactics) {
    const grade = card.grade;
    const price = grade === 1 ? 20 : grade === 2 ? 45 : 75;
    items.push({
      id: `tactic-${card.id}`,
      label: card.name,
      type: 'card',
      price,
      cardId: card.id,
    });
  }

  for (const relic of relics) {
    items.push({
      id: `relic-${relic.id}`,
      label: relic.name,
      type: 'relic',
      price: 140,
      relicId: relic.id,
    });
  }

  items.push(
    {
      id: 'restore-30',
      label: 'HP 회복 30',
      type: 'restore',
      price: 60,
    },
    {
      id: 'remove-card',
      label: '카드 제거',
      type: 'remove',
      price: 75,
    },
  );

  return items;
}
