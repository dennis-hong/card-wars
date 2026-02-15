import { RunEventChoice, RunEventDefinition } from '@/lib/roguelike/run-types';

import { DeterministicRandom } from '@/lib/rng';

export const ROGUELIKE_EVENTS: RunEventDefinition[] = [
  {
    id: 'brotherhood',
    title: '도원결의',
    flavor: '세 사람이 의형제를 맺고자 합니다.',
    icon: '🍑',
    choices: [
      {
        id: 'join',
        title: '함께한다',
        description: '적극적으로 의형제를 받아들인다. 촉 무장 카드 1종 획득.',
        effects: [{ type: 'relic', relicId: 'di-lu' }],
      },
      {
        id: 'decline',
        title: '거절한다',
        description: '금 30 획득.',
        effects: [{ type: 'gold', value: 30 }],
      },
    ],
  },
  {
    id: 'burning-ford',
    title: '적벽의 불길',
    flavor: '강 위로 불길이 번집니다.',
    icon: '🔥',
    choices: [
      {
        id: 'into-flame',
        title: '불 속으로',
        description: 'HP -15. 화공 전법 강화 기회는 없음.',
        effects: [{ type: 'hp', value: -15 }],
      },
      {
        id: 'pass',
        title: '우회한다',
        description: '변화 없음.',
        effects: [],
      },
    ],
  },
  {
    id: 'triple-visit',
    title: '삼고초려',
    flavor: '초당에 현자가 있다는 소문을 듣고 찾아갑니다.',
    icon: '🏯',
    choices: [
      {
        id: 'visit-thrice',
        title: '세 번 방문한다',
        description: 'HP -10, 3성 카드 1장 획득.',
        effects: [
          { type: 'hp', value: -10 },
          { type: 'card', cardId: 'w-zhuge-liang' },
        ],
      },
      {
        id: 'rest',
        title: '돌아간다',
        description: 'HP +10.',
        effects: [{ type: 'hp', value: 10 }],
      },
    ],
  },
  {
    id: 'single-duel',
    title: '단기필마',
    flavor: '적장이 일기토를 청합니다.',
    icon: '⚔️',
    choices: [
      {
        id: 'accept-duel',
        title: '맞선다',
        description: '적 무장을 1장 획득.',
        effects: [{ type: 'card', cardId: 'w-zhang-fei' }],
      },
      {
        id: 'reject-duel',
        title: '거절한다',
        description: '금 20 획득.',
        effects: [{ type: 'gold', value: 20 }],
      },
    ],
  },
  {
    id: 'rival-ride',
    title: '적토마',
    flavor: '명마를 발견했습니다.',
    icon: '🐴',
    choices: [
      {
        id: 'tame',
        title: '길들인다',
        description: '50% 성공으로 적토마 획득, 실패 시 HP -20.',
        effects: [
          { type: 'relic', relicId: 'red-hare' },
          { type: 'hp', value: -20 },
        ],
      },
      {
        id: 'leave',
        title: '놓아준다',
        description: 'HP +10.',
        effects: [{ type: 'hp', value: 10 }],
      },
    ],
  },
  {
    id: 'spy-letter',
    title: '밀서',
    flavor: '적의 밀서를 입수했습니다.',
    icon: '📜',
    choices: [
      {
        id: 'read',
        title: '읽는다',
        description: '다음 전투에서 적의 전법을 먼저 확인한다.',
        effects: [{ type: 'relic', relicId: 'art-of-war' }],
      },
      {
        id: 'sell',
        title: '팔아넘긴다',
        description: '금 40 획득.',
        effects: [{ type: 'gold', value: 40 }],
      },
    ],
  },
  {
    id: 'entertain',
    title: '주연',
    flavor: '마을에서 술을 대접해줍니다.',
    icon: '🍺',
    choices: [
      {
        id: 'revel',
        title: '마음껏 먹는다',
        description: 'HP +25, 다음 전투 전위 선공 불가.',
        effects: [{ type: 'hp', value: 25 }],
      },
      {
        id: 'moderate',
        title: '절제한다',
        description: 'HP +10.',
        effects: [{ type: 'hp', value: 10 }],
      },
    ],
  },
  {
    id: 'bandit-ravine',
    title: '산적 소굴',
    flavor: '산적들이 통행료를 요구합니다.',
    icon: '🏔️',
    choices: [
      {
        id: 'fight-bandit',
        title: '싸운다',
        description: '승리 시 금 50.',
        effects: [{ type: 'gold', value: 50 }, { type: 'card', cardId: 'w-wen-chou' }],
      },
      {
        id: 'pay',
        title: '지불한다',
        description: '금 -25.',
        effects: [{ type: 'gold', value: -25 }],
      },
      {
        id: 'remove-card',
        title: '카드를 내놓는다',
        description: '무작위 전법 1개 제거(후반 보상용 이벤트).',
        effects: [{ type: 'removeCard', value: 1 }],
      },
    ],
  },
];

const EVENT_BY_ID = new Map<string, RunEventDefinition>(
  ROGUELIKE_EVENTS.map((event) => [event.id, event]),
);

const DEFAULT_RANDOM: DeterministicRandom = { next: Math.random };

export function pickRandomEvent(random: DeterministicRandom = DEFAULT_RANDOM): RunEventDefinition {
  const index = Math.floor(random.next() * ROGUELIKE_EVENTS.length);
  return ROGUELIKE_EVENTS[index];
}

export function getEventById(id: string): RunEventDefinition | null {
  return EVENT_BY_ID.get(id) ?? null;
}

export function getChoiceById(
  event: RunEventDefinition,
  choiceId: string,
): RunEventChoice | undefined {
  return event.choices.find((choice) => choice.id === choiceId);
}
