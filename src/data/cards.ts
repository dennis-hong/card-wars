import { WarriorCard, TacticCard } from '@/types/game';

// ============================================================
// 무장 카드 20장
// ============================================================

export const WARRIOR_CARDS: WarriorCard[] = [
  // ── 위(魏) 5장 ──
  {
    id: 'w-cao-cao',
    type: 'warrior',
    name: '조조',
    faction: '위',
    grade: 3,
    stats: { attack: 7, command: 9, intel: 9, defense: 3 },
    skills: [
      { name: '패왕의 기세', description: '아군 전체 무력+2 (레벨에 따라 증가)', type: 'active' },
      { name: '간웅', description: '적 전법 1회 무효', type: 'passive' },
    ],
  },
  {
    id: 'w-sima-yi',
    type: 'warrior',
    name: '사마의',
    faction: '위',
    grade: 4,
    stats: { attack: 4, command: 7, intel: 10, defense: 4 },
    skills: [
      { name: '공성계', description: '적 전위 행동불가', type: 'active' },
      { name: '은인자중', description: '턴 종료 시 방어 증가(레벨에 따라 증가)', type: 'passive' },
      { name: '천리안', description: '적 전법 카드 공개', type: 'ultimate' },
    ],
  },
  {
    id: 'w-zhang-liao',
    type: 'warrior',
    name: '장료',
    faction: '위',
    grade: 2,
    stats: { attack: 8, command: 7, intel: 5, defense: 3 },
    skills: [
      { name: '위풍당당', description: '전위일 때 무력+3', type: 'passive' },
    ],
  },
  {
    id: 'w-xu-huang',
    type: 'warrior',
    name: '서황',
    faction: '위',
    grade: 2,
    stats: { attack: 7, command: 8, intel: 4, defense: 4 },
    skills: [
      { name: '철벽수비', description: '방어 증가, 1턴 (레벨에 따라 증가)', type: 'active' },
    ],
  },
  {
    id: 'w-zhang-he',
    type: 'warrior',
    name: '장합',
    faction: '위',
    grade: 1,
    stats: { attack: 6, command: 6, intel: 4, defense: 3 },
    skills: [],
  },

  // ── 촉(蜀) 5장 ──
  {
    id: 'w-liu-bei',
    type: 'warrior',
    name: '유비',
    faction: '촉',
    grade: 3,
    stats: { attack: 5, command: 8, intel: 7, defense: 3 },
    skills: [
      { name: '인덕', description: '아군 전체 HP 회복 (레벨에 따라 증가)', type: 'active' },
      { name: '의형제', description: '촉 세력 시너지 2배', type: 'passive' },
    ],
  },
  {
    id: 'w-zhuge-liang',
    type: 'warrior',
    name: '제갈량',
    faction: '촉',
    grade: 4,
    stats: { attack: 3, command: 6, intel: 10, defense: 3 },
    skills: [
      { name: '팔진도', description: '적 전체 지력 데미지', type: 'active' },
      { name: '동남풍', description: '화공 데미지 2배', type: 'passive' },
      { name: '출사표', description: '아군 전체 스탯+2', type: 'ultimate' },
    ],
  },
  {
    id: 'w-guan-yu',
    type: 'warrior',
    name: '관우',
    faction: '촉',
    grade: 3,
    stats: { attack: 9, command: 8, intel: 7, defense: 2 },
    skills: [
      { name: '청룡언월도', description: '단일 대상 무력×1.5', type: 'active' },
      { name: '의리', description: '유비 파티 시 무력+2', type: 'passive' },
    ],
  },
  {
    id: 'w-huang-zhong',
    type: 'warrior',
    name: '황충',
    faction: '촉',
    grade: 2,
    stats: { attack: 8, command: 6, intel: 5, defense: 2 },
    skills: [
      { name: '백발백중', description: '후위에서도 전위 공격 가능', type: 'active' },
    ],
  },
  {
    id: 'w-ji-ling',
    type: 'warrior',
    name: '기령',
    faction: '촉',
    grade: 1,
    stats: { attack: 5, command: 5, intel: 4, defense: 3 },
    skills: [],
  },

  // ── 오(吳) 5장 ──
  {
    id: 'w-sun-quan',
    type: 'warrior',
    name: '손권',
    faction: '오',
    grade: 3,
    stats: { attack: 6, command: 8, intel: 8, defense: 3 },
    skills: [
      { name: '용병술', description: '전법 카드 1장 추가 드로우', type: 'active' },
      { name: '대의', description: '오 세력 방어 증가 (레벨에 따라 증가)', type: 'passive' },
    ],
  },
  {
    id: 'w-zhou-yu',
    type: 'warrior',
    name: '주유',
    faction: '오',
    grade: 4,
    stats: { attack: 5, command: 7, intel: 10, defense: 2 },
    skills: [
      { name: '화공대사', description: '화공 데미지 ×2', type: 'passive' },
      { name: '미주공', description: '적 지력-3', type: 'active' },
      { name: '적벽화공', description: '적 전체 대형 화염 데미지', type: 'ultimate' },
    ],
  },
  {
    id: 'w-gan-ning',
    type: 'warrior',
    name: '감녕',
    faction: '오',
    grade: 2,
    stats: { attack: 8, command: 6, intel: 4, defense: 2 },
    skills: [
      { name: '야습', description: '첫 턴 선공 + 추가 타격', type: 'active' },
    ],
  },
  {
    id: 'w-pang-de',
    type: 'warrior',
    name: '방덕',
    faction: '오',
    grade: 2,
    stats: { attack: 7, command: 7, intel: 3, defense: 4 },
    skills: [
      { name: '결사항전', description: 'HP 30% 이하 시 무력 2배', type: 'passive' },
    ],
  },
  {
    id: 'w-pan-zhang',
    type: 'warrior',
    name: '반장',
    faction: '오',
    grade: 1,
    stats: { attack: 5, command: 6, intel: 3, defense: 3 },
    skills: [],
  },

  // ── 군벌 5장 ──
  {
    id: 'w-lu-bu',
    type: 'warrior',
    name: '여포',
    faction: '군벌',
    grade: 4,
    stats: { attack: 10, command: 8, intel: 3, defense: 2 },
    skills: [
      { name: '무쌍', description: '공격 시 방어 무시', type: 'passive' },
      { name: '방천화극', description: '인접 적 동시 타격', type: 'active' },
      { name: '일기당천', description: '적 전체 무력 데미지', type: 'ultimate' },
    ],
  },
  {
    id: 'w-zhang-fei',
    type: 'warrior',
    name: '장비',
    faction: '촉',
    grade: 3,
    stats: { attack: 9, command: 7, intel: 4, defense: 3 },
    skills: [
      { name: '장판교', description: '전위일 때 첫 공격 완전 방어', type: 'passive' },
      { name: '뇌성벽력', description: '적 전위 1턴 기절', type: 'active' },
    ],
  },
  {
    id: 'w-chen-lan',
    type: 'warrior',
    name: '진란',
    faction: '군벌',
    grade: 1,
    stats: { attack: 5, command: 5, intel: 5, defense: 2 },
    skills: [],
  },
  {
    id: 'w-wen-chou',
    type: 'warrior',
    name: '문추',
    faction: '군벌',
    grade: 1,
    stats: { attack: 6, command: 5, intel: 3, defense: 3 },
    skills: [],
  },
  {
    id: 'w-dong-zhuo',
    type: 'warrior',
    name: '동탁',
    faction: '군벌',
    grade: 2,
    stats: { attack: 6, command: 7, intel: 6, defense: 4 },
    skills: [
      { name: '폭정', description: '적 전체 통솔 감소 (레벨에 따라 증가)', type: 'active' },
    ],
  },
];

// ============================================================
// 전법 카드 8장
// ============================================================

export const TACTIC_CARDS: TacticCard[] = [
  {
    id: 't-fire',
    type: 'tactic',
    name: '화공',
    description: '적 전체 데미지 (강화 시 증가)',
    baseStat: '지력',
    grade: 2,
  },
  {
    id: 't-ambush',
    type: 'tactic',
    name: '매복',
    description: '아군 회피 부여 (강화 시 지속 증가)',
    baseStat: 'none',
    grade: 1,
  },
  {
    id: 't-chain',
    type: 'tactic',
    name: '연환계',
    description: '적 1체 행동불가 (강화 시 턴 증가)',
    baseStat: '지력',
    grade: 2,
  },
  {
    id: 't-taunt',
    type: 'tactic',
    name: '도발',
    description: '적 공격 전위 집중 (강화 시 턴 증가)',
    baseStat: 'none',
    grade: 1,
  },
  {
    id: 't-heal',
    type: 'tactic',
    name: '치유',
    description: '아군 1체 HP 회복 (강화 시 증가)',
    baseStat: '지력',
    grade: 1,
  },
  {
    id: 't-buff',
    type: 'tactic',
    name: '강화',
    description: '아군 1체 무력 증가 (강화 시 수치/턴 증가)',
    baseStat: 'none',
    grade: 1,
  },
  {
    id: 't-rockfall',
    type: 'tactic',
    name: '낙석',
    description: '적 1체 대형 데미지 (강화 시 증가)',
    baseStat: '무력',
    grade: 2,
  },
  {
    id: 't-counter',
    type: 'tactic',
    name: '반계',
    description: '적 전법 1회 반사 (강화 시 반사 피해 증가)',
    baseStat: '지력',
    grade: 2,
  },
];

export function getTacticEffectLines(card: TacticCard, level = 1): string[] {
  const tacticLevel = Math.max(1, Math.floor(level));
  const turnsBy5 = 1 + Math.floor((tacticLevel - 1) / 5);
  const turnsBy6 = 1 + Math.floor((tacticLevel - 1) / 6);

  switch (card.id) {
    case 't-fire': {
      const dmg = 4 + (tacticLevel - 1);
      return [`기본 피해: ${dmg} (적 전체)`];
    }
    case 't-ambush': {
      return [`회피 부여: ${turnsBy5}턴`, '야습/매복 강화 시 아군 전체'];
    }
    case 't-chain': {
      return [`행동불가: ${turnsBy6}턴`, '대상: 적 전위 1체'];
    }
    case 't-taunt': {
      return [`공격 집중: ${turnsBy6}턴`, '대상: 적 공격 전위 집중'];
    }
    case 't-heal': {
      const heal = 5 + (tacticLevel - 1);
      return [`회복: +${heal}`, '대상: 아군 최저 HP 1체'];
    }
    case 't-buff': {
      const buff = 3 + (tacticLevel - 1);
      return [`무력 버프: +${buff} (${turnsBy6}턴)`, '대상: 아군 전위 1체'];
    }
    case 't-rockfall': {
      const raw = 8 + (tacticLevel - 1);
      return [`공격력: ${raw}`, '적 1체 단독 타격, 최종 데미지는 방어 반영'];
    }
    case 't-counter': {
      const reflected = 3 + (tacticLevel - 1);
      return ['적 전법 1회 반사', `반사 피해: ${reflected}`];
    }
    default:
      return [card.description];
  }
}

// ============================================================
// All cards combined
// ============================================================

export const ALL_CARDS = [...WARRIOR_CARDS, ...TACTIC_CARDS];

export function getCardById(id: string) {
  return ALL_CARDS.find((c) => c.id === id);
}

export function getWarriorById(id: string) {
  return WARRIOR_CARDS.find((c) => c.id === id);
}

export function getTacticById(id: string) {
  return TACTIC_CARDS.find((c) => c.id === id);
}
