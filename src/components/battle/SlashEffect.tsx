'use client';

import React from 'react';
import { motion } from 'motion/react';

interface Props {
  style: React.CSSProperties;
  side: 'player' | 'enemy';
  critical?: boolean;
}

function seeded(seed: number) {
  const value = Math.sin(seed * 73.17) * 10000;
  return value - Math.floor(value);
}

export default function SlashEffect({ style, side, critical = false }: Props) {
  const base = side === 'player'
    ? { main: 'rgba(100,180,255,0.95)', soft: 'rgba(160,215,255,0.85)' }
    : { main: 'rgba(255,100,100,0.95)', soft: 'rgba(255,188,188,0.85)' };
  const edge = critical ? 'rgba(250,204,21,0.95)' : base.soft;

  return (
    <div style={style} className="pointer-events-none overflow-visible">
      <motion.div className="relative h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${base.main}, ${edge}, transparent)`,
            boxShadow: critical
              ? `0 0 14px ${edge}, 0 0 32px ${edge}`
              : `0 0 10px ${base.main}, 0 0 22px ${base.main}`,
          }}
          initial={{ opacity: 0, scaleX: 0.15 }}
          animate={{ opacity: [0, 1, 0], scaleX: [0.15, 1.12, 0.82] }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
        />

        <motion.div
          className="absolute -inset-y-1 inset-x-0 rounded-full blur-sm"
          style={{ background: `linear-gradient(90deg, transparent, ${edge}66, transparent)` }}
          initial={{ opacity: 0, scaleX: 0.2 }}
          animate={{ opacity: [0, 0.9, 0], scaleX: [0.2, 0.92, 0.65] }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        />

        {Array.from({ length: critical ? 14 : 10 }).map((_, i) => {
          const tx = (seeded(i + 1) - 0.5) * 58;
          const ty = (seeded((i + 5) * 3) - 0.5) * 26;
          return (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 rounded-full"
              style={{
                width: critical ? 4 : 3,
                height: critical ? 4 : 3,
                background: i % 2 === 0 ? edge : base.soft,
                boxShadow: `0 0 10px ${edge}`,
              }}
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{
                x: [0, tx],
                y: [0, ty],
                opacity: [0, 0.95, 0],
                scale: [0.7, 1.15, 0.5],
              }}
              transition={{ duration: 0.32, delay: i * 0.01, ease: 'easeOut' }}
            />
          );
        })}
      </motion.div>
    </div>
  );
}
