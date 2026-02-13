'use client';

import { TacticCard, GRADE_COLORS, OwnedCard } from '@/types/game';

interface Props {
  card: TacticCard;
  owned?: OwnedCard;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  duplicateCount?: number;
}

const SIZE_CLASSES = {
  sm: 'w-24 h-36 text-[10px]',
  md: 'w-40 h-56 text-sm',
  lg: 'w-52 h-72 text-base',
};

export default function TacticCardView({ card, owned, size = 'md', onClick, selected, disabled, duplicateCount }: Props) {
  const gradeColor = GRADE_COLORS[card.grade];

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`
        relative rounded-lg overflow-hidden select-none
        transition-all duration-200
        ${SIZE_CLASSES[size]}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
        ${selected ? 'ring-2 ring-yellow-400 scale-105' : ''}
      `}
      style={{
        background: `linear-gradient(135deg, #1a1a2e, ${gradeColor}33)`,
        border: `2px solid ${gradeColor}88`,
      }}
    >
      {/* Duplicate count badge */}
      {duplicateCount !== undefined && duplicateCount > 0 && (
        <div className="absolute -top-1 -right-1 z-10 bg-purple-600 text-white text-[10px] font-black rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 border-2 border-purple-400 shadow-lg shadow-purple-500/30">
          x{duplicateCount + 1}
        </div>
      )}

      {/* Header */}
      <div className="p-1.5 text-center" style={{ background: `${gradeColor}22` }}>
        <div className={`font-bold text-white ${size === 'lg' ? 'text-lg' : size === 'md' ? 'text-base' : ''}`}>{card.name}</div>
        <div className={`text-gray-400 ${size === 'sm' ? '' : 'text-xs'}`}>전법</div>
      </div>

      {/* Emoji icon */}
      <div className={`flex items-center justify-center bg-black/20 rounded mx-2 ${size === 'sm' ? 'mt-1 py-1' : 'mt-2 py-2'}`}>
        <span className={size === 'lg' ? 'text-5xl' : size === 'md' ? 'text-4xl' : 'text-3xl'}>{card.emoji}</span>
      </div>

      {/* Description */}
      <div className={`px-2 mt-1.5 text-center text-gray-300 leading-tight line-clamp-2 ${size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : 'text-[9px]'}`}>
        {card.description}
      </div>

      {/* Base stat */}
      {card.baseStat !== 'none' && (
        <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 ${size === 'sm' ? 'text-[8px] px-1.5 py-0' : 'text-[10px] px-2 py-0.5'} bg-white/10 text-gray-400 rounded-full border border-white/10 whitespace-nowrap`}>
          {card.baseStat}
        </div>
      )}

      {owned && (
        <div className={`absolute top-0.5 right-0.5 bg-black/60 text-yellow-400 px-1 rounded ${size === 'sm' ? 'text-[9px]' : 'text-xs font-bold'}`}>
          Lv.{owned.level}
        </div>
      )}
    </div>
  );
}
