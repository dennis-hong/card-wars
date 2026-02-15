import { Card } from '@/types/game';
import { WARRIOR_CARDS, TACTIC_CARDS } from '@/data/cards';
import { getRelicList } from '@/lib/roguelike/relics';

export type ShopItemType = 'card' | 'relic' | 'restore' | 'remove';

export interface ShopItem {
  id: string;
  label: string;
  type: ShopItemType;
  price: number;
  cardId?: string;
  relicId?: string;
}

export function buildShopInventory(): ShopItem[] {
  const warriors = WARRIOR_CARDS.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  const tactics = TACTIC_CARDS.slice().sort(() => Math.random() - 0.5).slice(0, 2);
  const relics = getRelicList().sort(() => Math.random() - 0.5).slice(0, 1);

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
