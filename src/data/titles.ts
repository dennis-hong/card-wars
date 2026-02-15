import { Title } from '@/types/game';

export const TITLE_CATEGORY_LABELS: Record<Title['category'], string> = {
  wins: '⚔️ 탐색전',
  collection: '📚 수집',
  streak: '🔥 연승',
  roguelike: '🗺️ 탐험',
};

export const TITLES: Title[] = [
  // 전투/승리
  {
    id: 'title-3wins',
    name: '탐험의 초심',
    description: '3회 탐험 승리',
    category: 'wins',
    condition: (stats) => stats.wins >= 3,
  },
  {
    id: 'title-20wins',
    name: '천하의 선봉',
    description: '20회 탐험 승리',
    category: 'wins',
    condition: (stats) => stats.wins >= 20,
  },
  {
    id: 'title-50wins',
    name: '원정의 대제',
    description: '50회 탐험 승리',
    category: 'wins',
    condition: (stats) => stats.wins >= 50,
  },

  // 수집
  {
    id: 'title-collect-40',
    name: '병참관',
    description: '전력 카드 40% 수집',
    category: 'collection',
    condition: (_stats, collectionRate) => collectionRate >= 40,
  },
  {
    id: 'title-collect-75',
    name: '전술서 연구가',
    description: '전력 카드 75% 수집',
    category: 'collection',
    condition: (_stats, collectionRate) => collectionRate >= 75,
  },
  {
    id: 'title-collect-100',
    name: '고문헌 관장',
    description: '전력 카드 100% 수집',
    category: 'collection',
    condition: (_stats, collectionRate) => collectionRate >= 100,
  },

  // 연승
  {
    id: 'title-streak-4',
    name: '연승의 기세',
    description: '4연승 달성',
    category: 'streak',
    condition: (stats) => stats.maxStreak >= 4,
  },
  {
    id: 'title-streak-8',
    name: '무패의 기상',
    description: '8연승 달성',
    category: 'streak',
    condition: (stats) => stats.maxStreak >= 8,
  },
  {
    id: 'title-streak-15',
    name: '전장 불패',
    description: '15연승 달성',
    category: 'streak',
    condition: (stats) => stats.maxStreak >= 15,
  },

  // 탐험 로그라이크 축적
  {
    id: 'title-rogue-1',
    name: '원정 초심',
    description: '원정 1회 완료',
    category: 'roguelike',
    condition: (stats) => stats.scenariosCleared >= 1,
  },
  {
    id: 'title-rogue-3',
    name: '노상행군',
    description: '원정 3회 완료',
    category: 'roguelike',
    condition: (stats) => stats.scenariosCleared >= 3,
  },
  {
    id: 'title-rogue-7',
    name: '황건 토벌자',
    description: '원정 7회 완료',
    category: 'roguelike',
    condition: (stats) => stats.scenariosCleared >= 7,
  },
];

export function getTitleById(id: string) {
  return TITLES.find((t) => t.id === id);
}

export function getTitleCategoryLabel(category: Title['category']) {
  return TITLE_CATEGORY_LABELS[category];
}
