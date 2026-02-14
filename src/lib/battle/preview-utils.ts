import { BattleFieldEvent, BattleWarrior } from '@/types/game';

type Lane = BattleWarrior['lane'];

const LANE_ORDER: Lane[] = ['front', 'mid', 'back'];

export function getFirstAlive(warriors: BattleWarrior[]): BattleWarrior | undefined {
  for (const lane of LANE_ORDER) {
    const target = warriors.find((w) => w.lane === lane && w.isAlive);
    if (target) return target;
  }
  return undefined;
}

export function getForecastTarget(enemies: BattleWarrior[]): BattleWarrior | undefined {
  const taunter = enemies.find((w) => w.isAlive && w.statusEffects.some((e) => e.type === 'taunt' && e.turnsLeft > 0));
  if (taunter) return taunter;
  return getFirstAlive(enemies);
}

export function getLaneLabel(lane: Lane): string {
  return lane === 'front' ? '전위' : lane === 'mid' ? '중위' : '후위';
}

export function getFieldEffectSummary(effect: BattleFieldEvent['effect']) {
  switch (effect) {
    case 'defense_plus_2':
      return { applied: ['전 무장 방어 +2'], pending: [] };
    case 'attack_plus_2':
      return { applied: ['전 무장 무력 +2'], pending: [] };
    case 'front_defense_plus_3':
      return { applied: ['전위 방어 +3'], pending: [] };
    case 'back_attack_minus_2':
      return { applied: ['후위 무력 -2 (최소 1)'], pending: [] };
    case 'morale_boost':
      return { applied: ['전 무장 무력 +1'], pending: [] };
    case 'wu_bonus':
      return { applied: ['오 세력 전 스탯 +1'], pending: [] };
    case 'fire_boost':
      return { applied: ['화공 데미지 x2'], pending: [] };
    case 'disable_fire':
      return { applied: ['화공 무효화'], pending: [] };
    case 'skip_front_first_turn':
      return { applied: ['1턴 전위 행동 불가 (아군/적군)'], pending: [] };
    case 'ambush_boost':
      return { applied: ['매복 사용 시 아군 전체 회피 부여'], pending: [] };
    default:
      return { applied: [], pending: [] };
  }
}
