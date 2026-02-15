'use client';

import { useMemo } from 'react';
import { getCardById } from '@/data/cards';
import { useRunContext } from '@/context/run-context';
import RunHeader from '@/components/roguelike/RunHeader';

export default function RoguelikeRestPage() {
  const {
    state,
    healByRest,
    upgradeWarriorInRun,
    goToMap,
  } = useRunContext();

  const warriors = useMemo(() => {
    return state.deck.warriors
      .map((slot) => state.inventory.find((card) => card.instanceId === slot.instanceId))
      .filter(Boolean)
      .map((owned) => {
        const card = getCardById(owned?.cardId || '');
        return {
          instanceId: owned!.instanceId,
          cardName: card?.name || '알 수 없음',
          level: owned?.level || 1,
        };
      });
  }, [state.deck.warriors, state.inventory]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <RunHeader />

      <div className="p-4 space-y-4">
        <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
          <div className="text-sm text-gray-300">휴식지</div>
          <div className="text-xl font-bold">진지 보급</div>
        </div>

        <button
          onClick={() => {
            healByRest();
            goToMap();
          }}
          className="ui-btn ui-btn-primary w-full py-4"
        >
          휴식하기
        </button>

        <div className="rounded-2xl border border-white/15 bg-black/35 p-4 space-y-3">
          <div className="text-sm font-bold">무장 강화 (레벨 +1)</div>
          {warriors.length === 0 ? (
            <div className="text-sm text-gray-300">편성된 무장이 없습니다.</div>
          ) : (
            warriors.map((warrior) => (
              <button
                key={warrior.instanceId}
                onClick={() => upgradeWarriorInRun(warrior.instanceId)}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-left hover:bg-black/50"
              >
                <div className="font-bold text-white">{warrior.cardName}</div>
                <div className="text-sm text-gray-300">Lv.{warrior.level}</div>
              </button>
            ))
          )}
        </div>

        <button
          onClick={() => {
            goToMap();
          }}
          className="ui-btn ui-btn-neutral w-full py-3"
        >
          다음 노드로
        </button>
      </div>
    </div>
  );
}
