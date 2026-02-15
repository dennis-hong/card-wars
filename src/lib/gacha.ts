import { Card, Grade, PackType, PACK_INFO } from '@/types/game';
import { WARRIOR_CARDS, TACTIC_CARDS } from '@/data/cards';
import { DeterministicRandom, randomInt, randomPick } from '@/lib/rng';

const ALL_GACHA_CARDS: Card[] = [...WARRIOR_CARDS, ...TACTIC_CARDS];

function getCardsByGrade(grade: Grade): Card[] {
  return ALL_GACHA_CARDS.filter((c) => c.grade === grade);
}

function rollGrade(packType: PackType, random: DeterministicRandom): Grade {
  const r = random.next() * 100;
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
  return 1;
}

function createRandomSource(random?: DeterministicRandom): DeterministicRandom {
  return random ?? { next: Math.random };
}

export function openPack(packType: PackType, random?: DeterministicRandom): Card[] {
  const rng = createRandomSource(random);
  const info = PACK_INFO[packType];
  const cards: Card[] = [];

  // guaranteed card
  const guaranteedCards = getCardsByGrade(info.guaranteed);
  if (guaranteedCards.length > 0) {
    cards.push(randomPick(guaranteedCards, rng));
  }

  // remaining
  while (cards.length < info.cardCount) {
    const grade = rollGrade(packType, rng);
    const pool = getCardsByGrade(grade);
    if (pool.length > 0) {
      cards.push(randomPick(pool, rng));
    }
  }

  // shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, rng);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}
