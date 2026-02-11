import { Title } from '@/types/game';

export const TITLES: Title[] = [
  // 승수 기반
  {
    id: 'title-10wins',
    name: '신참 무장',
    description: '10승 달성',
    category: 'wins',
    condition: (stats) => stats.wins >= 10,
  },
  {
    id: 'title-50wins',
    name: '역전의 용사',
    description: '50승 달성',
    category: 'wins',
    condition: (stats) => stats.wins >= 50,
  },
  {
    id: 'title-100wins',
    name: '천하무적',
    description: '100승 달성',
    category: 'wins',
    condition: (stats) => stats.wins >= 100,
  },
  // 수집 기반
  {
    id: 'title-collect-50',
    name: '수집가',
    description: '전체 카드 50% 수집',
    category: 'collection',
    condition: (_stats, collectionRate) => collectionRate >= 50,
  },
  {
    id: 'title-collect-100',
    name: '완전수집',
    description: '전체 카드 100% 수집',
    category: 'collection',
    condition: (_stats, collectionRate) => collectionRate >= 100,
  },
  // 연승 기반
  {
    id: 'title-streak-5',
    name: '파죽지세',
    description: '5연승 달성',
    category: 'streak',
    condition: (stats) => stats.maxStreak >= 5,
  },
  {
    id: 'title-streak-10',
    name: '무패의 군왕',
    description: '10연승 달성',
    category: 'streak',
    condition: (stats) => stats.maxStreak >= 10,
  },
];

export function getTitleById(id: string) {
  return TITLES.find((t) => t.id === id);
}
