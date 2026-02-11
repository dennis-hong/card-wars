import { Card, Grade, PackType, PACK_INFO } from '@/types/game';
import { WARRIOR_CARDS, TACTIC_CARDS } from '@/data/cards';

const ALL_GACHA_CARDS: Card[] = [...WARRIOR_CARDS, ...TACTIC_CARDS];

function getCardsByGrade(grade: Grade): Card[] {
  return ALL_GACHA_CARDS.filter((c) => c.grade === grade);
}

function rollGrade(packType: PackType): Grade {
  const r = Math.random() * 100;
  switch (packType) {
    case 'normal':
      if (r < 1) return 4;
      if (r < 8) return 3;
      if (r < 30) return 2;
      return 1;
    case 'rare':
      if (r < 3) return 4;
      if (r < 15) return 3;
      if (r < 50) return 2;
      return 1;
    case 'hero':
      if (r < 8) return 4;
      if (r < 35) return 3;
      if (r < 65) return 2;
      return 1;
    case 'legend':
      if (r < 20) return 4;
      if (r < 50) return 3;
      if (r < 80) return 2;
      return 1;
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function openPack(packType: PackType): Card[] {
  const info = PACK_INFO[packType];
  const cards: Card[] = [];

  // guaranteed card
  const guaranteedCards = getCardsByGrade(info.guaranteed);
  if (guaranteedCards.length > 0) {
    cards.push(pickRandom(guaranteedCards));
  }

  // remaining
  while (cards.length < info.cardCount) {
    const grade = rollGrade(packType);
    const pool = getCardsByGrade(grade);
    if (pool.length > 0) {
      cards.push(pickRandom(pool));
    }
  }

  // shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}
