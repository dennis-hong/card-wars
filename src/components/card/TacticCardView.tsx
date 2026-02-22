'use client';

import Image from 'next/image';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { TacticCard, GRADE_COLORS, BaseCardViewProps, CARD_SIZE_CLASSES } from '@/types/game';
import { getTacticEffectLines } from '@/data/cards';
import { TACTIC_IMAGES } from '@/lib/tactic-images';

interface Props extends BaseCardViewProps {
  card: TacticCard;
  disabled?: boolean;
}

function getDepthShadow(grade: TacticCard['grade']) {
  if (grade === 4) return '0 22px 42px rgba(251,191,36,0.26), 0 4px 14px rgba(15,23,42,0.66)';
  if (grade === 3) return '0 18px 36px rgba(168,85,247,0.24), 0 4px 12px rgba(15,23,42,0.62)';
  if (grade === 2) return '0 16px 30px rgba(59,130,246,0.18), 0 4px 12px rgba(15,23,42,0.58)';
  return '0 14px 24px rgba(15,23,42,0.48)';
}

export default function TacticCardView({ card, owned, size = 'md', onClick, selected, disabled, duplicateCount }: Props) {
  const gradeColor = GRADE_COLORS[card.grade];
  const tacticLevel = Math.max(1, owned?.level ?? 1);
  const effectLines = getTacticEffectLines(card, tacticLevel);
  const previewLines = size === 'sm' ? effectLines.slice(0, 1) : effectLines.slice(0, 2);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 240, damping: 20, mass: 0.45 });
  const springRotateY = useSpring(rotateY, { stiffness: 240, damping: 20, mass: 0.45 });

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    rotateY.set((px - 0.5) * 10);
    rotateX.set((0.5 - py) * 10);
  };

  const resetTilt = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const rarityGlowClass = card.grade === 4 ? 'rarity-glow-sss' : card.grade === 3 ? 'rarity-glow-ss' : card.grade === 2 ? 'rarity-glow-s' : '';

  return (
    <motion.div
      onClick={disabled ? undefined : onClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      className={`
        relative rounded-lg overflow-hidden select-none
        ${CARD_SIZE_CLASSES[size]}
        ${disabled ? 'opacity-45 cursor-not-allowed' : onClick ? 'cursor-pointer' : 'cursor-default'}
        ${selected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#071635]' : ''}
        ${rarityGlowClass}
      `}
      whileHover={!disabled ? { scale: selected ? 1.06 : 1.04, y: -4 } : undefined}
      whileTap={!disabled ? { scale: 0.96, rotateX: 0, rotateY: 0 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 22, mass: 0.8 }}
      style={{
        rotateX: springRotateX,
        rotateY: springRotateY,
        transformPerspective: 920,
        transformStyle: 'preserve-3d',
        background: `linear-gradient(150deg, rgba(10,16,35,0.92) 0%, ${gradeColor}2f 55%, rgba(4,8,23,0.96) 100%)`,
        border: `2px solid ${gradeColor}88`,
        boxShadow: getDepthShadow(card.grade),
      }}
    >
      {duplicateCount !== undefined && duplicateCount > 0 && (
        <div className="absolute -top-1 -right-1 z-10 bg-purple-600 text-white text-[10px] font-black rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 border-2 border-purple-400 shadow-lg shadow-purple-500/30">
          x{duplicateCount + 1}
        </div>
      )}

      <div className="relative p-1.5 text-center" style={{ background: `${gradeColor}22` }}>
        <div className={`font-bold text-white ${size === 'lg' ? 'text-lg' : size === 'md' ? 'text-base' : 'text-xs'}`}>{card.name}</div>
        <div className={`text-gray-400 ${size === 'sm' ? 'text-[9px]' : 'text-xs'}`}>전법</div>
      </div>

      <div className={`relative overflow-hidden rounded mx-2 ${size === 'sm' ? 'mt-1 h-14' : size === 'md' ? 'mt-2 h-24' : 'mt-2 h-32'}`}>
        {TACTIC_IMAGES[card.id] ? (
          <Image
            src={TACTIC_IMAGES[card.id]}
            alt={card.name}
            fill
            className="object-cover"
            sizes={size === 'sm' ? '80px' : size === 'md' ? '144px' : '192px'}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-black/20">
            <span className={size === 'lg' ? 'text-5xl' : size === 'md' ? 'text-4xl' : 'text-3xl'}>전법</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {card.grade >= 3 && (
          <motion.div
            className="absolute inset-0 pointer-events-none holo-foil"
            style={{ opacity: card.grade === 4 ? 0.6 : 0.45 }}
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: card.grade === 4 ? 1.8 : 2.4, ease: 'linear', repeat: Infinity }}
          />
        )}
      </div>

      <div className={`px-2 mt-1.5 text-center text-gray-300 leading-tight line-clamp-2 ${size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : 'text-[9px]'}`}>
        {card.description}
      </div>

      <div className={`px-2 mt-1 text-center ${size === 'sm' ? 'text-[7px]' : 'text-[10px]'} text-emerald-200`}>
        {previewLines.map((line, i) => (
          <div key={`${card.id}-${i}`} className="truncate">
            {line}
          </div>
        ))}
      </div>

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
    </motion.div>
  );
}
