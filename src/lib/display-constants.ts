import { Lane } from '@/types/game';

export const CARD_SLOT_SIZE_CLASSES = {
  sm: 'w-24 h-36 text-[10px]',
  md: 'w-40 h-56 text-sm',
  lg: 'w-52 h-72 text-base',
} as const;

export type CardSlotSize = keyof typeof CARD_SLOT_SIZE_CLASSES;

export const BATTLE_LANES: readonly Lane[] = ['front', 'mid', 'back'] as const;

export const LANE_LABELS: Record<Lane, string> = {
  front: '전위',
  mid: '중위',
  back: '후위',
};
