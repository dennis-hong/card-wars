'use client';

import { WarriorCard, GRADE_LABELS, GRADE_COLORS, FACTION_COLORS, OwnedCard } from '@/types/game';

interface Props {
  card: WarriorCard;
  owned?: OwnedCard;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
  showDetails?: boolean;
  duplicateCount?: number;
}

const SIZE_CLASSES = {
  sm: 'w-24 h-36 text-[10px]',
  md: 'w-40 h-56 text-sm',
  lg: 'w-52 h-72 text-base',
};

export default function WarriorCardView({ card, owned, size = 'md', onClick, selected, showDetails, duplicateCount }: Props) {
  const gradeColor = GRADE_COLORS[card.grade];
  const factionColor = FACTION_COLORS[card.faction];
  const isLegend = card.grade === 4;
  const isHero = card.grade >= 3;

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-lg overflow-hidden cursor-pointer select-none
        transition-all duration-200
        ${SIZE_CLASSES[size]}
        ${selected ? 'ring-2 ring-yellow-400 scale-105' : 'hover:scale-105'}
        ${isLegend ? 'shadow-[0_0_20px_rgba(255,170,0,0.5)]' : isHero ? 'shadow-[0_0_12px_rgba(170,68,255,0.4)]' : 'shadow-lg'}
      `}
      style={{
        background: `linear-gradient(135deg, ${factionColor}22, ${gradeColor}44)`,
        border: `2px solid ${gradeColor}`,
      }}
    >
      {/* Grade glow for legendary */}
      {isLegend && (
        <div className="absolute inset-0 animate-pulse opacity-20" style={{
          background: `radial-gradient(circle, ${gradeColor}, transparent)`,
        }} />
      )}

      {/* Duplicate count badge */}
      {duplicateCount !== undefined && duplicateCount > 0 && (
        <div className="absolute -top-1 -right-1 z-10 bg-purple-600 text-white text-[10px] font-black rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 border-2 border-purple-400 shadow-lg shadow-purple-500/30">
          x{duplicateCount + 1}
        </div>
      )}

      {/* Header */}
      <div className="relative p-1.5 text-center" style={{ background: `${gradeColor}33` }}>
        <div className={`font-bold text-white truncate ${size === 'lg' ? 'text-lg' : size === 'md' ? 'text-base' : ''}`}>{card.name}</div>
        <div className="flex justify-between items-center px-1">
          <span className="opacity-80" style={{ color: factionColor }}>{card.faction}</span>
          <span>{GRADE_LABELS[card.grade]}</span>
        </div>
      </div>

      {/* Portrait placeholder */}
      <div className="relative mx-2 mt-1 rounded bg-black/30 flex items-center justify-center aspect-square">
        <span className={size === 'sm' ? 'text-3xl' : 'text-4xl'}>{card.grade === 4 ? '🌟' : '⚔️'}</span>
        {owned && (
          <div className={`absolute top-0.5 right-0.5 bg-black/60 text-yellow-400 px-1 rounded ${size === 'sm' ? 'text-[9px]' : 'text-xs font-bold'}`}>
            Lv.{owned.level}
          </div>
        )}
      </div>

      {/* Stats */}
      {size === 'sm' ? (
        <div className="flex items-center justify-center gap-0.5 px-1 mt-1 text-[11px] font-bold leading-none">
          <span className="text-red-400">{card.stats.attack}</span>
          <span className="text-white/40">/</span>
          <span className="text-green-400">{card.stats.command}</span>
          <span className="text-white/40">/</span>
          <span className="text-blue-400">{card.stats.intel}</span>
          <span className="text-white/40">/</span>
          <span className="text-yellow-400">{card.stats.defense}</span>
        </div>
      ) : (
        <div className={`grid grid-cols-4 px-1.5 text-center text-white ${size === 'lg' ? 'mt-2 gap-1.5' : 'mt-1 gap-1'}`}>
          <div title="무력">
            <div className={`${size === 'lg' ? 'text-sm' : 'text-xs'} leading-tight`}>⚔️</div>
            <div className={`font-bold ${size === 'lg' ? 'text-xl' : 'text-base'} text-red-400`}>{card.stats.attack}</div>
          </div>
          <div title="통솔">
            <div className={`${size === 'lg' ? 'text-sm' : 'text-xs'} leading-tight`}>🛡️</div>
            <div className={`font-bold ${size === 'lg' ? 'text-xl' : 'text-base'} text-green-400`}>{card.stats.command}</div>
          </div>
          <div title="지력">
            <div className={`${size === 'lg' ? 'text-sm' : 'text-xs'} leading-tight`}>🧠</div>
            <div className={`font-bold ${size === 'lg' ? 'text-xl' : 'text-base'} text-blue-400`}>{card.stats.intel}</div>
          </div>
          <div title="방어">
            <div className={`${size === 'lg' ? 'text-sm' : 'text-xs'} leading-tight`}>🏰</div>
            <div className={`font-bold ${size === 'lg' ? 'text-xl' : 'text-base'} text-yellow-400`}>{card.stats.defense}</div>
          </div>
        </div>
      )}

      {/* Skills (only in detail mode) */}
      {showDetails && card.skills.length > 0 && size !== 'sm' && (
        <div className={`px-1.5 mt-1 space-y-0.5 ${size === 'lg' ? 'mt-2' : ''}`}>
          {card.skills.map((s) => (
            <div key={s.name} className={`text-gray-300 truncate ${size === 'lg' ? 'text-xs' : size === 'md' ? 'text-[11px]' : 'text-[9px]'}`}>
              <span className={s.type === 'ultimate' ? 'text-yellow-400' : s.type === 'passive' ? 'text-blue-300' : 'text-green-300'}>
                ●
              </span>{' '}
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
