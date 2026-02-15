import { WarriorStats } from '@/types/game';

export type RelicEffectType =
  | 'stat_boost'
  | 'first_strike'
  | 'heal_on_win'
  | 'gold_boost'
  | 'tactic_boost'
  | 'debuff_enemy'
  | 'double_strike'
  | 'dodge'
  | 'immune_fire'
  | 'defense_per_turn';

export interface RelicEffect {
  type: RelicEffectType;
  stat?: keyof WarriorStats;
  value?: number;
  target?: 'front' | 'all';
  percent?: number;
  chance?: number;
}

export interface RelicDefinition {
  id: string;
  name: string;
  description: string;
  category: 'weapon' | 'armor' | 'book' | 'horse' | 'jewel';
  icon: string;
  effect: RelicEffect;
}

const RELICS: RelicDefinition[] = [
  {
    id: 'green-dragon-blade',
    name: '청룡언월도',
    description: '전위 무장 무력 +3',
    category: 'weapon',
    icon: '⚔️',
    effect: { type: 'stat_boost', stat: 'attack', value: 3, target: 'front' },
  },
  {
    id: 'yitian-sword',
    name: '의천검',
    description: '전투 시작 시 적 전위 방어 -2',
    category: 'weapon',
    icon: '🗡️',
    effect: { type: 'debuff_enemy', stat: 'defense', value: 2, target: 'front' },
  },
  {
    id: 'sky-piercer',
    name: '방천화극',
    description: '공격 시 20% 확률 2타격',
    category: 'weapon',
    icon: '🔱',
    effect: { type: 'double_strike', chance: 0.2 },
  },
  {
    id: 'rattan-armor',
    name: '등갑',
    description: '화공 데미지 무효',
    category: 'armor',
    icon: '🛡️',
    effect: { type: 'immune_fire' },
  },
  {
    id: 'emperor-crown',
    name: '면류관',
    description: '매 턴 아군 전체 방어 +1',
    category: 'armor',
    icon: '👑',
    effect: { type: 'defense_per_turn', value: 1 },
  },
  {
    id: 'art-of-war',
    name: '손자병법',
    description: '전법 데미지 +30%',
    category: 'book',
    icon: '📖',
    effect: { type: 'tactic_boost', percent: 0.3 },
  },
  {
    id: 'taiping-scroll',
    name: '태평요술서',
    description: '전투 승리 시 HP +8 회복',
    category: 'book',
    icon: '📜',
    effect: { type: 'heal_on_win', value: 8 },
  },
  {
    id: 'red-hare',
    name: '적토마',
    description: '피격 시 15% 회피',
    category: 'horse',
    icon: '🐎',
    effect: { type: 'dodge', chance: 0.15 },
  },
  {
    id: 'di-lu',
    name: '적로마',
    description: '항상 선공',
    category: 'horse',
    icon: '🐎',
    effect: { type: 'first_strike' },
  },
  {
    id: 'imperial-seal',
    name: '전국옥새',
    description: '금 획득량 +50%',
    category: 'jewel',
    icon: '👑',
    effect: { type: 'gold_boost', percent: 0.5 },
  },
];

const RELIC_BY_ID = new Map<string, RelicDefinition>(
  RELICS.map((relic) => [relic.id, relic])
);

export function getRelicById(id: string): RelicDefinition | null {
  return RELIC_BY_ID.get(id) ?? null;
}

export function getRelicList(): RelicDefinition[] {
  return RELICS;
}

export function hasRelic(relics: readonly string[], id: string): boolean {
  return relics.includes(id);
}

export function getRelicIcon(id: string): string {
  const relic = getRelicById(id);
  return relic?.icon || '🏺';
}
