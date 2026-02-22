'use client';

import { motion } from 'motion/react';

interface ParticleConfig {
  key: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  travel: number;
  opacity: number;
}

function seeded(seed: number) {
  const value = Math.sin(seed * 92.71) * 10000;
  return value - Math.floor(value);
}

const PARTICLES: ParticleConfig[] = Array.from({ length: 22 }).map((_, i) => ({
  key: `ambient-${i}`,
  x: seeded(i + 1) * 100,
  y: seeded((i + 1) * 7) * 100,
  size: 2 + Math.round(seeded((i + 3) * 17) * 4),
  duration: 10 + seeded((i + 5) * 13) * 9,
  delay: seeded((i + 11) * 29) * 4,
  drift: (seeded((i + 7) * 19) - 0.5) * 36,
  travel: 12 + seeded((i + 9) * 31) * 24,
  opacity: 0.14 + seeded((i + 15) * 41) * 0.22,
}));

export default function AmbientParticles() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.12),transparent_46%),radial-gradient(circle_at_84%_12%,rgba(14,116,144,0.10),transparent_42%)]" />
      {PARTICLES.map((particle) => (
        <motion.span
          key={particle.key}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: 'rgba(186, 230, 253, 0.75)',
            boxShadow: '0 0 10px rgba(56, 189, 248, 0.28)',
          }}
          animate={{
            x: [0, particle.drift, 0],
            y: [0, -particle.travel, 0],
            scale: [1, 1.25, 1],
            opacity: [particle.opacity * 0.5, particle.opacity, particle.opacity * 0.45],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
