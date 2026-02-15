import { randomInt } from '@/lib/rng';
import { WARRIOR_CARDS, TACTIC_CARDS } from '@/data/cards';
import { Lane } from '@/types/game';
import { RunAct, RunEnemyTemplate } from '@/lib/roguelike/run-types';
import { DeterministicRandom } from '@/lib/rng';

const DEFAULT_RANDOM: DeterministicRandom = { next: Math.random };

const LANES: Lane[] = ['front', 'mid', 'back'];

function buildPools(): { normal: string[]; elite: string[]; boss: string[] } {
  return {
    normal: WARRIOR_CARDS.filter((c) => c.grade <= 2).map((c) => c.id),
    elite: WARRIOR_CARDS.filter((c) => c.grade >= 3).map((c) => c.id),
    boss: WARRIOR_CARDS.filter((c) => c.grade >= 2).map((c) => c.id),
  };
}

function pickOne(pool: string[], random: DeterministicRandom): string {
  if (pool.length === 0) return '';
  return pool[randomInt(pool.length, random)];
}

function pickMany(pool: string[], count: number, random: DeterministicRandom): string[] {
  const source = [...pool];
  const picked: string[] = [];
  while (source.length > 0 && picked.length < count) {
    const idx = randomInt(source.length, random);
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
  random: DeterministicRandom,
): RunEnemyTemplate {
  const levelShift = Math.max(1, levelBase);
  const templateWarriors: RunEnemyTemplate['warriors'] = [];

  for (let i = 0; i < warriors.length; i++) {
    const lane = LANES[i % LANES.length];
    templateWarriors.push({
      cardId: warriors[i],
      lane,
      level: Math.max(1, levelShift + randomInt(2, random)),
    });
  }

  const tacticCards = pickMany(TACTIC_CARDS.map((c) => c.id), tacticCount, random)
    .filter((cardId) => cardId)
    .map((cardId) => ({ cardId, level: Math.max(1, levelShift + randomInt(3, random)) }));

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
  random?: DeterministicRandom,
): RunEnemyTemplate {
  const rng = random ?? DEFAULT_RANDOM;
  const { normal, elite, boss } = buildPools();

  if (nodeType === 'elite') {
    if (act === 1) {
      const warriors = [pickOne(elite, rng), ...pickMany(normal, 2, rng)].filter(Boolean);
      const gold = scaleGold(30, 50, act);
      return {
        ...buildTemplate(warriors, 2, act + 1, 'rare', rng),
        rewardGoldMin: gold.min,
        rewardGoldMax: gold.max,
        relicChoices: ['green-dragon-blade', 'rattan-armor', 'art-of-war'],
      };
    }

    if (act === 2) {
      const warriors = [pickOne(elite, rng), pickOne(normal, rng), pickOne(normal, rng)].filter(Boolean);
      const gold = scaleGold(30, 50, act);
      return {
        ...buildTemplate(warriors, 2, act + 2, 'hero', rng),
        rewardGoldMin: gold.min,
        rewardGoldMax: gold.max,
        relicChoices: ['sky-piercer', 'yitian-sword', 'di-lu'],
      };
    }

    const warriors = [pickOne(elite, rng), pickOne(elite, rng), pickOne(normal, rng)].filter(Boolean);
    const gold = scaleGold(30, 50, act);
    return {
        ...buildTemplate(warriors, 2, act + 3, 'hero', rng),
      rewardGoldMin: gold.min,
      rewardGoldMax: gold.max,
      relicChoices: ['emperor-crown', 'taiping-scroll', 'imperial-seal'],
    };
  }

  if (nodeType === 'boss') {
    if (act === 1) {
      const warriors = ['w-lu-bu', pickOne(normal, rng), pickOne(normal, rng)].filter(Boolean);
      const gold = scaleGold(50, 100, act);
      return {
        ...buildTemplate(warriors, 2, act + 2, 'hero', rng),
        rewardGoldMin: gold.min,
        rewardGoldMax: gold.max,
        relicChoices: ['emperor-crown'],
      };
    }

    if (act === 2) {
      const warriors = ['w-dong-zhuo', pickOne(elite, rng), pickOne(normal, rng)].filter(Boolean);
      const gold = scaleGold(50, 100, act);
      return {
        ...buildTemplate(warriors, 2, act + 2, 'hero', rng),
        rewardGoldMin: gold.min,
        rewardGoldMax: gold.max,
        relicChoices: ['imperial-seal'],
      };
    }

    const act3Boss = [pickOne(boss, rng), pickOne(boss, rng), pickOne(boss, rng)].filter(Boolean);
    const gold = scaleGold(50, 100, act);
    return {
        ...buildTemplate(act3Boss, 2, act + 3, 'legend', rng),
      rewardGoldMin: gold.min,
      rewardGoldMax: gold.max,
      relicChoices: ['art-of-war', 'taiping-scroll', 'imperial-seal'],
    };
  }

  if (act === 1) {
    return {
      ...buildTemplate(pickMany(normal, 3, rng), 2, act + 1, 'normal', rng),
      rewardGoldMin: 15,
      rewardGoldMax: 25,
      relicChoices: [],
    };
  }

  if (act === 2) {
    const warriors = [...pickMany(normal, 2, rng), pickOne(elite, rng)].filter(Boolean);
    return {
      ...buildTemplate(warriors, 2, act + 1, 'normal', rng),
      rewardGoldMin: 15,
      rewardGoldMax: 25,
      relicChoices: [],
    };
  }

  const warriors = [...pickMany(normal, 1, rng), ...pickMany(elite, 2, rng)].filter(Boolean);
  return {
      ...buildTemplate(warriors, 2, act + 2, 'rare', rng),
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
