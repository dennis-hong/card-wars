'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PackType } from '@/types/game';
import { PACK_INFO } from '@/types/game';
import { createSeededRandom } from '@/lib/rng';

interface Props {
  packType: PackType;
  compact: boolean;
  onDone: () => void;
}

type TearStage = 'charge' | 'rip' | 'burst';

export default function PackTearView({ packType, compact, onDone }: Props) {
  const info = PACK_INFO[packType];
  const [stage, setStage] = useState<TearStage>('charge');

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage('rip'), 340),
      setTimeout(() => setStage('burst'), 840),
      setTimeout(onDone, 1260),
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
        {stage === 'burst' && (
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle, ${info.color}55 0%, transparent 62%)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      <div
        className="relative"
        style={{ width: compact ? 192 : 224, height: compact ? 248 : 288 }}
      >
        <motion.div
          className="absolute inset-0 rounded-2xl border"
          style={{
            borderColor: `${info.color}`,
            background: `linear-gradient(150deg, ${info.color}44 0%, rgba(9,12,22,0.95) 50%, ${info.color}30 100%)`,
          }}
          animate={
            stage === 'charge'
              ? { scale: [1, 0.98, 1.04], opacity: 1 }
              : stage === 'rip'
              ? { scale: [1.04, 0.98], opacity: [1, 0.25, 0] }
              : { scale: 0.96, opacity: 0 }
          }
          transition={{
            duration: stage === 'charge' ? 0.33 : 0.38,
            repeat: stage === 'charge' ? Infinity : 0,
            ease: 'easeOut',
          }}
        />

        <motion.div
          className="absolute inset-y-0 left-0 w-1/2 rounded-l-2xl border-r border-white/18"
          style={{ background: `linear-gradient(120deg, ${info.color}66, rgba(7,10,19,0.85))` }}
          animate={
            stage === 'rip'
              ? { x: -92, rotate: -15, opacity: [1, 1, 0.3] }
              : stage === 'burst'
              ? { x: -150, rotate: -24, opacity: 0 }
              : { x: 0, rotate: 0, opacity: 1 }
          }
          transition={{ duration: stage === 'charge' ? 0.2 : 0.45, ease: 'easeOut' }}
        />

        <motion.div
          className="absolute inset-y-0 right-0 w-1/2 rounded-r-2xl border-l border-white/18"
          style={{ background: `linear-gradient(240deg, ${info.color}66, rgba(7,10,19,0.85))` }}
          animate={
            stage === 'rip'
              ? { x: 92, rotate: 15, opacity: [1, 1, 0.3] }
              : stage === 'burst'
              ? { x: 150, rotate: 24, opacity: 0 }
              : { x: 0, rotate: 0, opacity: 1 }
          }
          transition={{ duration: stage === 'charge' ? 0.2 : 0.45, ease: 'easeOut' }}
        />

        <motion.div
          className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2"
          style={{ background: `linear-gradient(180deg, transparent, #fff, transparent)` }}
          animate={
            stage === 'charge'
              ? { opacity: [0.2, 0.65, 0.2], scaleY: [0.6, 1.1, 0.7] }
              : stage === 'rip'
              ? { opacity: [0.8, 1, 0.4], scaleY: [1, 1.2, 0.6] }
              : { opacity: 0 }
          }
          transition={{ duration: 0.42 }}
        />

        <motion.div
          className="absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `radial-gradient(circle, ${info.color}cc 0%, ${info.color}44 45%, transparent 70%)` }}
          animate={
            stage === 'burst'
              ? { scale: [0.4, 1.35, 2], opacity: [0.4, 0.95, 0] }
              : stage === 'rip'
              ? { scale: [0.2, 0.8], opacity: [0.1, 0.5] }
              : { scale: 0.1, opacity: 0.2 }
          }
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />

      {stage !== 'charge' && (
        <div className="absolute inset-0">
          {Array.from({ length: 14 }).map((_, i) => {
            const progress = createSeededRandom(i + 1).next();
            return (
              <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2 rounded-sm"
                  style={{
                    width: compact ? 5 : 6,
                    height: compact ? 2 : 3,
                    background: i % 2 ? '#ffffff' : info.color,
                    position: 'absolute',
                    left: compact ? -2 : -2,
                    top: compact ? -2 : -2,
                    marginLeft: -2.5,
                    marginTop: -2.5,
                  }}
                  initial={{ x: -2, y: -2, opacity: 0 }}
                  animate={{
                    x: (progress - 0.5) * (compact ? 220 : 280),
                    y: (progress - 0.5) * (compact ? 190 : 240),
                    rotate: progress * 420,
                    opacity: stage === 'burst' ? [0, 1, 0] : [0, 0.7, 0],
                  }}
                  transition={{ duration: 0.58, ease: 'easeOut', delay: i * 0.015 }}
                />
              );
            })}
          </div>
        )}
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
