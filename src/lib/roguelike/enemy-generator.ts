import { randomInt } from '@/lib/rng';
import { WARRIOR_CARDS, TACTIC_CARDS } from '@/data/cards';
import { Lane } from '@/types/game';
import { RunAct, RunEnemyTemplate } from '@/lib/roguelike/run-types';

const LANES: Lane[] = ['front', 'mid', 'back'];

function buildPools(): { normal: string[]; elite: string[]; boss: string[] } {
  return {
    normal: WARRIOR_CARDS.filter((c) => c.grade <= 2).map((c) => c.id),
    elite: WARRIOR_CARDS.filter((c) => c.grade >= 3).map((c) => c.id),
    boss: WARRIOR_CARDS.filter((c) => c.grade >= 2).map((c) => c.id),
  };
}

function pickOne(pool: string[]): string {
  if (pool.length === 0) return '';
  return pool[randomInt(pool.length, { next: Math.random })];
}

function pickMany(pool: string[], count: number): string[] {
  const source = [...pool];
  const picked: string[] = [];
  while (source.length > 0 && picked.length < count) {
    const idx = randomInt(source.length, { next: Math.random });
    picked.push(source[idx]);
    source.splice(idx, 1);
  }
  return picked;
}

function buildTemplate(
  warriors: string[],
  tacticCount: number,
  levelBase: number,
  packReward: 'normal' | 'rare' | 'hero' | 'legend',
): RunEnemyTemplate {
  const levelShift = Math.max(1, levelBase);
  const templateWarriors: RunEnemyTemplate['warriors'] = [];

  for (let i = 0; i < warriors.length; i++) {
    const lane = LANES[i % LANES.length];
    templateWarriors.push({
      cardId: warriors[i],
      lane,
      level: Math.max(1, levelShift + randomInt(2, { next: Math.random })),
    });
  }

  const tacticCards = pickMany(TACTIC_CARDS.map((c) => c.id), tacticCount)
    .filter((cardId) => cardId)
    .map((cardId) => ({ cardId, level: Math.max(1, levelShift + randomInt(3, { next: Math.random })) }));

  return {
    warriors: templateWarriors,
    ownedCards: [],
    tactics: tacticCards,
    packReward,
    rewardGoldMin: 12,
    rewardGoldMax: 20,
    relicChoices: [],
  };
}

function scaleGold(baseMin: number, baseMax: number, act: RunAct): { min: number; max: number } {
  if (act === 1) return { min: baseMin, max: baseMax };
  if (act === 2) return { min: baseMin + 2, max: baseMax + 10 };
  return { min: baseMin + 6, max: baseMax + 18 };
}

export function getEnemyTemplate(
  act: RunAct,
  nodeType: 'battle' | 'elite' | 'boss',
): RunEnemyTemplate {
  const { normal, elite, boss } = buildPools();

  if (nodeType === 'elite') {
    if (act === 1) {
      const warriors = [pickOne(elite), ...pickMany(normal, 2)].filter(Boolean);
      const gold = scaleGold(30, 50, act);
      return {
        ...buildTemplate(warriors, 2, act + 1, 'rare'),
        rewardGoldMin: gold.min,
        rewardGoldMax: gold.max,
        relicChoices: ['green-dragon-blade', 'rattan-armor', 'art-of-war'],
      };
    }

    if (act === 2) {
      const warriors = [pickOne(elite), pickOne(normal), pickOne(normal)].filter(Boolean);
      const gold = scaleGold(30, 50, act);
      return {
        ...buildTemplate(warriors, 2, act + 2, 'hero'),
        rewardGoldMin: gold.min,
        rewardGoldMax: gold.max,
        relicChoices: ['sky-piercer', 'yitian-sword', 'di-lu'],
      };
    }

    const warriors = [pickOne(elite), pickOne(elite), pickOne(normal)].filter(Boolean);
    const gold = scaleGold(30, 50, act);
    return {
      ...buildTemplate(warriors, 2, act + 3, 'hero'),
      rewardGoldMin: gold.min,
      rewardGoldMax: gold.max,
      relicChoices: ['emperor-crown', 'taiping-scroll', 'imperial-seal'],
    };
  }

  if (nodeType === 'boss') {
    if (act === 1) {
      const warriors = ['w-lu-bu', pickOne(normal), pickOne(normal)].filter(Boolean);
      const gold = scaleGold(50, 100, act);
      return {
        ...buildTemplate(warriors, 2, act + 2, 'hero'),
        rewardGoldMin: gold.min,
        rewardGoldMax: gold.max,
        relicChoices: ['emperor-crown'],
      };
    }

    if (act === 2) {
      const warriors = ['w-dong-zhuo', pickOne(elite), pickOne(normal)].filter(Boolean);
      const gold = scaleGold(50, 100, act);
      return {
        ...buildTemplate(warriors, 2, act + 2, 'hero'),
        rewardGoldMin: gold.min,
        rewardGoldMax: gold.max,
        relicChoices: ['imperial-seal'],
      };
    }

    const act3Boss = [pickOne(boss), pickOne(boss), pickOne(boss)].filter(Boolean);
    const gold = scaleGold(50, 100, act);
    return {
      ...buildTemplate(act3Boss, 2, act + 3, 'legend'),
      rewardGoldMin: gold.min,
      rewardGoldMax: gold.max,
      relicChoices: ['art-of-war', 'taiping-scroll', 'imperial-seal'],
    };
  }

  if (act === 1) {
    return {
      ...buildTemplate(pickMany(normal, 3), 2, act + 1, 'normal'),
      rewardGoldMin: 15,
      rewardGoldMax: 25,
      relicChoices: [],
    };
  }

  if (act === 2) {
    const warriors = [...pickMany(normal, 2), pickOne(elite)].filter(Boolean);
    return {
      ...buildTemplate(warriors, 2, act + 1, 'normal'),
      rewardGoldMin: 15,
      rewardGoldMax: 25,
      relicChoices: [],
    };
  }

  const warriors = [...pickMany(normal, 1), ...pickMany(elite, 2)].filter(Boolean);
  return {
    ...buildTemplate(warriors, 2, act + 2, 'rare'),
    rewardGoldMin: 18,
    rewardGoldMax: 30,
    relicChoices: [],
  };
}

export function getPackRewardTypeForNode(act: RunAct, nodeType: 'battle' | 'elite' | 'boss'): 'normal' | 'rare' | 'hero' | 'legend' {
  return getEnemyTemplate(act, nodeType).packReward;
}

export function getGoldRewardRange(act: RunAct, nodeType: 'battle' | 'elite' | 'boss'): { min: number; max: number } {
  const template = getEnemyTemplate(act, nodeType);
  return {
    min: template.rewardGoldMin,
    max: template.rewardGoldMax,
  };
}
