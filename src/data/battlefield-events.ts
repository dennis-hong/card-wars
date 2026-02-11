import { BattleFieldEvent } from '@/types/game';

export const BATTLEFIELD_EVENTS: BattleFieldEvent[] = [
  {
    name: '폭우',
    description: '거센 비가 내려 화공이 무효화됩니다',
    effect: 'disable_fire',
  },
  {
    name: '산악 지형',
    description: '험준한 산악 지형이 방어에 유리합니다',
    effect: 'defense_plus_2',
  },
  {
    name: '야간 기습',
    description: '어둠 속에서 전위가 첫 턴에 행동할 수 없습니다',
    effect: 'skip_front_first_turn',
  },
  {
    name: '평원 대전',
    description: '탁 트인 평원에서 무력이 빛을 발합니다',
    effect: 'attack_plus_2',
  },
  {
    name: '수상전',
    description: '물 위에서의 전투! 오 세력 스탯+1',
    effect: 'wu_bonus',
  },
  {
    name: '성벽 공방',
    description: '견고한 성벽 앞에서 방어가 강화됩니다',
    effect: 'front_defense_plus_3',
  },
  {
    name: '안개',
    description: '짙은 안개로 원거리 공격이 약해집니다',
    effect: 'back_attack_minus_2',
  },
  {
    name: '강풍',
    description: '강한 바람이 화공의 위력을 높입니다',
    effect: 'fire_boost',
  },
  {
    name: '매복 지형',
    description: '위험한 지형! 매복 효과가 강화됩니다',
    effect: 'ambush_boost',
  },
  {
    name: '사기 충천',
    description: '아군의 사기가 높습니다! 무력+1',
    effect: 'morale_boost',
  },
];

export function getRandomEvent(): BattleFieldEvent {
  return BATTLEFIELD_EVENTS[Math.floor(Math.random() * BATTLEFIELD_EVENTS.length)];
}
