import { Grade } from '@/types/game';

export const BOOSTER_ANIMATION_PRESETS = {
  impactShake: {
    initial: { x: 0, y: 0 },
    animate: {
      x: [0, -4, 4, -3, 3, 0],
      y: [0, -2, 2, 1, -1, 0],
      transition: { duration: 0.35, ease: 'easeInOut' as const },
    },
  },
  cardGradeTone: {
    1: '#94a3b8',
    2: '#3b82f6',
    3: '#a855f7',
    4: '#ffb100',
  } as Record<Grade, string>,
  gradeLabel: {
    1: 'COMMON',
    2: 'RARE',
    3: 'HERO',
    4: 'LEGEND',
  } as Record<Grade, string>,
  cinematicDelayMsByGrade: {
    1: 700,
    2: 700,
    3: 1200,
    4: 1900,
  } as Record<Grade, number>,
  revealSfxDelayMsByGrade: {
    1: 170,
    2: 190,
    3: 220,
    4: 250,
  } as Record<Grade, number>,
  burstParticle: {
    count: 14,
    speed: {
      normal: 280,
      elite: 340,
      hero: 340,
      legend: 420,
    },
    glowColor: {
      1: 'rgba(160,160,160,0.25)',
      2: 'rgba(59,130,246,0.35)',
      3: 'rgba(168,85,247,0.48)',
      4: 'rgba(255,177,0,0.55)',
    } as Record<Grade, string>,
  },
};

export const BATTLE_ANIMATION_PRESETS = {
  actionDelays: {
    showLogMs: 100,
    showSlashMs: 80,
    showHitMs: 350,
    clearStateMs: 100,
    showSkillNameMs: 100,
    showOverheadMs: 300,
  },
  combatFx: {
    floatingColor: {
      heal: '#4ade80',
      miss: '#9ca3af',
      skill: '#a78bfa',
      normal: '#ef4444',
    },
    turnStart: 350,
  },
};
