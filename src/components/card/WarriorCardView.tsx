'use client';

import { WarriorCard, GRADE_LABELS, GRADE_COLORS, FACTION_COLORS, OwnedCard } from '@/types/game';
import Image from 'next/image';
import { getWarriorImage } from '@/lib/warrior-images';
import { useState } from 'react';

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
  const portraitSrc = getWarriorImage(card.id);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-lg overflow-hidden cursor-pointer select-none
        transition-all duration-200 active:scale-95
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
        <div className="absolute inset-0 animate-pulse opacity-20 pointer-events-none" style={{
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

      {/* Portrait */}
      <div className="relative mx-2 mt-1 rounded overflow-hidden bg-black/30 flex items-center justify-center aspect-square">
        {portraitSrc && !imgError ? (
          <Image
            src={portraitSrc}
            alt={card.name}
            fill
            sizes={size === 'sm' ? '96px' : size === 'md' ? '160px' : '208px'}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className={size === 'sm' ? 'text-3xl' : 'text-4xl'}>{card.grade === 4 ? '🌟' : '⚔️'}</span>
        )}
        {/* Grade overlay shimmer for hero+ */}
        {isHero && (
          <div className="absolute inset-0 pointer-events-none opacity-30" style={{
            background: `linear-gradient(135deg, transparent 40%, ${gradeColor}66 50%, transparent 60%)`,
            backgroundSize: '200% 200%',
            animation: 'cardShimmer 3s ease-in-out infinite',
          }} />
        )}
        {owned && (
          <div className={`absolute top-0.5 right-0.5 bg-black/70 text-yellow-400 px-1 rounded ${size === 'sm' ? 'text-[9px]' : 'text-xs font-bold'}`}>
            Lv.{owned.level}
          </div>
        )}
      </div>

      {/* Stats */}
      {(() => {
        const lvlBonus = (owned?.level || 1) - 1;
        const defBonus = Math.floor(lvlBonus * 0.5);
        const stats = [
          { key: 'attack' as const, label: '무', labelLong: '무력', color: 'red', bonus: lvlBonus },
          { key: 'command' as const, label: '통', labelLong: '통솔', color: 'green', bonus: lvlBonus },
          { key: 'intel' as const, label: '지', labelLong: '지력', color: 'blue', bonus: lvlBonus },
          { key: 'defense' as const, label: '방', labelLong: '방어', color: 'yellow', bonus: defBonus },
        ];

        if (size === 'lg') return null;

        if (size === 'sm') {
          return (
            <div className="grid grid-cols-4 px-0.5 mt-1 text-center text-[9px] leading-tight">
              {stats.map(({ key, label, color }) => (
                <div key={key}><span className={`text-${color}-400/70`}>{label}</span> <span className={`text-${color}-400 font-bold`}>{card.stats[key]}</span></div>
              ))}
            </div>
          );
        }

        return (
          <div className={`grid grid-cols-4 px-1 text-center text-white bg-black/20 rounded mx-1.5 ${size === 'lg' ? 'mt-2 gap-1.5 py-1' : 'mt-1 gap-0.5 py-0.5'}`}>
            {stats.map(({ key, label, labelLong, color, bonus }) => {
              const value = card.stats[key] + bonus;
              return (
                <div key={key}>
                  <div className={`${size === 'lg' ? 'text-[10px]' : 'text-[9px]'} text-${color}-400/70 leading-tight`}>
                    {size === 'lg' ? labelLong : label}
                  </div>
                  <div className={`font-bold ${size === 'lg' ? 'text-xl' : 'text-sm'} text-${color}-400`}>
                    {value}
                    {bonus > 0 && <span className={`text-[9px] text-${color}-300/60 ml-0.5`}>+{bonus}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

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
