'use client';

import { WarriorCard, GRADE_LABELS, GRADE_COLORS, FACTION_COLORS, BaseCardViewProps, CARD_SIZE_CLASSES } from '@/types/game';
import Image from 'next/image';
import { getWarriorImage } from '@/lib/warrior-images';
import { useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

interface Props extends BaseCardViewProps {
  card: WarriorCard;
  showDetails?: boolean;
}

function getDepthShadow(grade: WarriorCard['grade']) {
  if (grade === 4) return '0 22px 44px rgba(251,191,36,0.28), 0 4px 14px rgba(15,23,42,0.68)';
  if (grade === 3) return '0 20px 38px rgba(168,85,247,0.22), 0 4px 12px rgba(15,23,42,0.62)';
  if (grade === 2) return '0 16px 30px rgba(59,130,246,0.18), 0 3px 10px rgba(15,23,42,0.58)';
  return '0 14px 26px rgba(15,23,42,0.52)';
}

export default function WarriorCardView({ card, owned, size = 'md', onClick, selected, showDetails, duplicateCount }: Props) {
  const gradeColor = GRADE_COLORS[card.grade];
  const factionColor = FACTION_COLORS[card.faction];
  const isLegend = card.grade === 4;
  const isHero = card.grade >= 3;
  const portraitSrc = getWarriorImage(card.id);
  const [imgError, setImgError] = useState(false);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 240, damping: 20, mass: 0.45 });
  const springRotateY = useSpring(rotateY, { stiffness: 240, damping: 20, mass: 0.45 });

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    rotateY.set((px - 0.5) * 11);
    rotateX.set((0.5 - py) * 11);
  };

  const resetTilt = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const rarityGlowClass = card.grade === 4 ? 'rarity-glow-sss' : card.grade === 3 ? 'rarity-glow-ss' : card.grade === 2 ? 'rarity-glow-s' : '';

  return (
    <motion.div
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      className={`
        relative rounded-lg overflow-hidden select-none
        ${CARD_SIZE_CLASSES[size]}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${selected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#071635]' : ''}
        ${rarityGlowClass}
      `}
      whileHover={{ scale: selected ? 1.06 : 1.04, y: -5 }}
      whileTap={{ scale: 0.96, rotateX: 0, rotateY: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, mass: 0.8 }}
      style={{
        rotateX: springRotateX,
        rotateY: springRotateY,
        transformPerspective: 920,
        transformStyle: 'preserve-3d',
        background: `linear-gradient(150deg, ${factionColor}1a 0%, ${gradeColor}3d 45%, rgba(6,13,34,0.95) 100%)`,
        border: `2px solid ${gradeColor}`,
        boxShadow: getDepthShadow(card.grade),
      }}
    >
      {isLegend && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${gradeColor}55, transparent 70%)`,
          }}
          animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {duplicateCount !== undefined && duplicateCount > 0 && (
        <div className="absolute -top-1 -right-1 z-10 bg-purple-600 text-white text-[10px] font-black rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 border-2 border-purple-400 shadow-lg shadow-purple-500/30">
          x{duplicateCount + 1}
        </div>
      )}

      <div className="relative p-1.5 text-center" style={{ background: `${gradeColor}33` }}>
        <div className={`font-bold text-white truncate ${size === 'lg' ? 'text-lg' : size === 'md' ? 'text-base' : 'text-xs'}`}>{card.name}</div>
        <div className="flex justify-between items-center px-1">
          <span className="opacity-80" style={{ color: factionColor }}>{card.faction}</span>
          <span>{GRADE_LABELS[card.grade]}</span>
        </div>
      </div>

      <div
        className={`relative mx-2 mt-1 rounded overflow-hidden bg-black/35 flex items-center justify-center ${
          size === 'sm' ? 'h-[58px]' : size === 'md' ? 'h-[88px]' : 'h-[164px]'
        }`}
      >
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

        {isHero && (
          <motion.div
            className={`absolute inset-0 pointer-events-none ${card.grade >= 3 ? 'holo-foil' : ''}`}
            style={{
              opacity: card.grade === 4 ? 0.6 : 0.42,
              backgroundImage:
                card.grade === 4
                  ? 'linear-gradient(125deg, transparent 12%, rgba(255,190,43,0.45) 44%, rgba(255,255,255,0.2) 51%, rgba(255,190,43,0.35) 60%, transparent 86%)'
                  : 'linear-gradient(125deg, transparent 15%, rgba(168,85,247,0.35) 45%, rgba(255,255,255,0.16) 52%, rgba(59,130,246,0.28) 62%, transparent 86%)',
              backgroundSize: '220% 220%',
            }}
            animate={{ backgroundPosition: ['-130% -130%', '130% 130%'] }}
            transition={{ duration: card.grade === 4 ? 2.1 : 2.8, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {owned && (
          <div className={`absolute top-0.5 right-0.5 bg-black/70 text-yellow-400 px-1 rounded ${size === 'sm' ? 'text-[9px]' : 'text-xs font-bold'}`}>
            Lv.{owned.level}
          </div>
        )}
      </div>

      {(() => {
        const lvlBonus = (owned?.level || 1) - 1;
        const defBonus = Math.floor(lvlBonus * 0.5);
        const stats = [
          { key: 'attack' as const, label: '무', color: 'red', bonus: lvlBonus },
          { key: 'command' as const, label: '통', color: 'green', bonus: lvlBonus },
          { key: 'intel' as const, label: '지', color: 'blue', bonus: lvlBonus },
          { key: 'defense' as const, label: '방', color: 'yellow', bonus: defBonus },
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
          <div className="grid grid-cols-4 px-1 text-center text-white bg-black/20 rounded mx-1.5 mt-1 gap-0.5 py-0.5">
            {stats.map(({ key, label, color, bonus }) => {
              const value = card.stats[key] + bonus;
              return (
                <div key={key}>
                  <div className={`text-[9px] text-${color}-400/70 leading-tight`}>
                    {label}
                  </div>
                  <div className={`font-bold text-sm text-${color}-400`}>
                    {value}
                    {bonus > 0 && <span className={`text-[9px] text-${color}-300/60 ml-0.5`}>+{bonus}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

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
    </motion.div>
  );
}
