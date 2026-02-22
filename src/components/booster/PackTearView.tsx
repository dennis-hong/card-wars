'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PackType } from '@/types/game';
import { PACK_INFO } from '@/types/game';

interface Props {
  packType: PackType;
  compact: boolean;
  onDone: () => void;
}

type TearStage = 'charge' | 'rip' | 'burst';

function seeded(seed: number) {
  const value = Math.sin(seed * 63.73) * 10000;
  return value - Math.floor(value);
}

function TearParticles({
  stage,
  compact,
  color,
}: {
  stage: TearStage;
  compact: boolean;
  color: string;
}) {
  const count = stage === 'rip' ? 18 : 30;

  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: count }).map((_, i) => {
        const angle = seeded(i + 5) * Math.PI * 2;
        const distance = (compact ? 130 : 170) + seeded((i + 9) * 3) * (compact ? 85 : 125);
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance * (stage === 'burst' ? 0.85 : 0.55);
        const dot = 2 + Math.round(seeded((i + 11) * 7) * (stage === 'burst' ? 4 : 2));

        return (
          <motion.span
            key={`${stage}-${i}`}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: dot,
              height: dot,
              marginLeft: -dot / 2,
              marginTop: -dot / 2,
              background: i % 3 === 0 ? '#fff7d6' : color,
              boxShadow: `0 0 12px ${color}`,
            }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
            animate={{
              x: [0, tx],
              y: [0, ty],
              opacity: [0, 1, 0],
              scale: [0.5, 1.2, 0.4],
            }}
            transition={{ duration: stage === 'rip' ? 0.42 : 0.7, ease: 'easeOut', delay: i * 0.009 }}
          />
        );
      })}
    </div>
  );
}

export default function PackTearView({ packType, compact, onDone }: Props) {
  const info = PACK_INFO[packType];
  const [stage, setStage] = useState<TearStage>('charge');

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage('rip'), 360),
      setTimeout(() => setStage('burst'), 860),
      setTimeout(onDone, 1320),
    ];
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at center, rgba(15,23,42,0.72), rgba(2,6,23,0.95))' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      />

      <AnimatePresence>
        {stage !== 'charge' && <TearParticles stage={stage} compact={compact} color={info.color} />}
      </AnimatePresence>

      <AnimatePresence>
        {stage === 'burst' && (
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle, ${info.color}66 0%, transparent 62%)` }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 1.7] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.52, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      <div className="relative" style={{ width: compact ? 196 : 236, height: compact ? 252 : 300 }}>
        <motion.div
          className="absolute inset-0 rounded-2xl border"
          style={{
            borderColor: `${info.color}`,
            background: `linear-gradient(150deg, ${info.color}4a 0%, rgba(9,12,22,0.95) 50%, ${info.color}34 100%)`,
          }}
          animate={
            stage === 'charge'
              ? { scale: [1, 0.98, 1.05], opacity: [0.9, 1, 0.95] }
              : stage === 'rip'
              ? { scale: [1.05, 1], opacity: [1, 0.42, 0] }
              : { scale: 0.96, opacity: 0 }
          }
          transition={{
            duration: stage === 'charge' ? 0.34 : 0.38,
            repeat: stage === 'charge' ? Infinity : 0,
            ease: 'easeOut',
          }}
        />

        <motion.div
          className="absolute inset-y-0 left-0 w-1/2 rounded-l-2xl border-r border-white/20"
          style={{ background: `linear-gradient(120deg, ${info.color}66, rgba(7,10,19,0.88))` }}
          animate={
            stage === 'rip'
              ? { x: compact ? -106 : -126, rotate: -17, opacity: [1, 1, 0.25] }
              : stage === 'burst'
              ? { x: compact ? -170 : -200, rotate: -28, opacity: 0 }
              : { x: 0, rotate: 0, opacity: 1 }
          }
          transition={{ duration: stage === 'charge' ? 0.22 : 0.48, ease: 'easeOut' }}
        />

        <motion.div
          className="absolute inset-y-0 right-0 w-1/2 rounded-r-2xl border-l border-white/20"
          style={{ background: `linear-gradient(240deg, ${info.color}66, rgba(7,10,19,0.88))` }}
          animate={
            stage === 'rip'
              ? { x: compact ? 106 : 126, rotate: 17, opacity: [1, 1, 0.25] }
              : stage === 'burst'
              ? { x: compact ? 170 : 200, rotate: 28, opacity: 0 }
              : { x: 0, rotate: 0, opacity: 1 }
          }
          transition={{ duration: stage === 'charge' ? 0.22 : 0.48, ease: 'easeOut' }}
        />

        <motion.div
          className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2"
          style={{ background: `linear-gradient(180deg, transparent, #fff, transparent)` }}
          animate={
            stage === 'charge'
              ? { opacity: [0.2, 0.75, 0.2], scaleY: [0.55, 1.12, 0.7] }
              : stage === 'rip'
              ? { opacity: [0.65, 1, 0.45], scaleY: [1, 1.3, 0.62] }
              : { opacity: 0 }
          }
          transition={{ duration: 0.4 }}
        />

        <motion.div
          className="absolute left-1/2 top-1/2 w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `radial-gradient(circle, ${info.color}d0 0%, ${info.color}45 48%, transparent 75%)` }}
          animate={
            stage === 'burst'
              ? { scale: [0.4, 1.35, 2.2], opacity: [0.35, 1, 0] }
              : stage === 'rip'
              ? { scale: [0.2, 0.95], opacity: [0.2, 0.6] }
              : { scale: 0.1, opacity: 0.2 }
          }
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      <motion.div
        className={`absolute ${compact ? 'bottom-[20%] text-sm' : 'bottom-[22%] text-base'} text-white/90 font-bold tracking-wide`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {info.name} OPENING...
      </motion.div>
    </div>
  );
}
