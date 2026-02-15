'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getCardById } from '@/data/cards';
import { getRelicById } from '@/lib/roguelike/relics';
import RunHeader from '@/components/roguelike/RunHeader';
import RelicDisplay from '@/components/roguelike/RelicDisplay';
import { useRunContext } from '@/context/run-context';

type ReplaceTarget = {
  mode: 'relic';
  relicId: string;
};

type None = {
  mode: 'none';
};

type RemoveTarget = {
  mode: 'remove';
  instanceId: string;
};

type Target = ReplaceTarget | RemoveTarget | None;

function getItemLabel(type: string) {
  if (type === 'card') return '카드';
  if (type === 'relic') return '보물';
  if (type === 'restore') return '회복';
  if (type === 'remove') return '제거';
  return '아이템';
}

export default function RoguelikeShopPage() {
  const router = useRouter();
  const {
    state,
    buyShopItem,
  } = useRunContext();

  const [target, setTarget] = useState<Target>({ mode: 'none' });
  const items = state.pendingShopItems || [];

  const relics = useMemo(() => state.relics.slice(0, 3), [state.relics]);

  if (!state.map || !state.currentNodeId) {
    return (
      <div className="min-h-screen ui-page p-4">
        <div className="text-center text-white">
          <div>상점 상태가 유효하지 않습니다.</div>
          <button
            onClick={() => router.push('/roguelike/map')}
            className="ui-btn ui-btn-primary mt-3 py-3 w-full"
          >
            맵으로
          </button>
        </div>
      </div>
    );
  }

  const buy = (itemId: string) => {
    if (state.phase !== 'shop') {
      router.push('/roguelike/map');
      return;
    }

    if (target.mode === 'relic' && state.relics.length >= 3) {
      if (!buyShopItem(itemId, target.relicId)) {
        return;
      }
      setTarget({ mode: 'none' });
      return;
    }

    if (target.mode === 'remove') {
      buyShopItem(itemId, undefined, target.instanceId);
      setTarget({ mode: 'none' });
      return;
    }

    buyShopItem(itemId);
  };

  const close = () => {
    setTarget({ mode: 'none' });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <RunHeader />

      <div className="p-3 space-y-4">
        <div className="rounded-xl border border-white/15 bg-black/35 p-3">
          <div className="text-sm text-gray-300 mb-1">보유 금액: {state.gold}G</div>
          <RelicDisplay relicIds={state.relics} size="sm" />
        </div>

        {target.mode !== 'none' && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3">
            {target.mode === 'relic' ? (
              <div>
                <div className="font-bold mb-2">보물 교체 대상: {getRelicById(target.relicId)?.name}</div>
                <button onClick={close} className="ui-btn ui-btn-neutral px-3 py-2 text-xs">취소</button>
              </div>
            ) : (
              <div>
                <div className="font-bold mb-2">카드 제거 대상으로 선택됨</div>
                <button onClick={close} className="ui-btn ui-btn-neutral px-3 py-2 text-xs">취소</button>
              </div>
            )}
          </div>
        )}

        {items.length === 0 && (
          <div className="text-gray-300 text-sm rounded-xl border border-white/10 bg-black/30 p-4">
            상점에 판매 아이템이 없습니다.
            <button onClick={() => router.push('/roguelike/map')} className="ui-btn ui-btn-primary w-full mt-3 py-3">
              맵으로
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {items.map((item) => {
            const canBuy = state.gold >= item.price;
            const relic = item.relicId ? getRelicById(item.relicId) : null;
            const card = item.cardId ? getCardById(item.cardId) : null;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-white/15 bg-black/35 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-black">
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-300 mt-0.5">{getItemLabel(item.type)} · {item.price}G</div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs ${canBuy ? 'bg-emerald-700' : 'bg-gray-700'}`}
                    >
                      {canBuy ? '구매 가능' : '금 부족'}
                    </span>
                  </div>
                </div>

                {relic && (
                  <div className="flex items-center gap-2 text-sm">
                    <Image
                      src={`/images/relics/${relic.id}.png`}
                      alt={relic.name}
                      width={36}
                      height={36}
                      className="rounded border border-white/20"
                    />
                    <span>{relic.description}</span>
                  </div>
                )}

                {card && (
                  <div className="text-sm text-gray-200">{card.name}</div>
                )}

                {item.type === 'relic' && state.relics.length >= 3 && (
                  <div className="text-xs text-amber-300">
                    보물 슬롯이 가득찼습니다. 교체할 슬롯을 먼저 선택하세요.
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {item.type === 'relic' && state.relics.length >= 3 && relics.length > 0 && (
                    relics.map((id) => (
                      <button
                        key={id}
                        onClick={() => setTarget({ mode: 'relic', relicId: id })}
                        className={`px-2 py-1 rounded border text-xs ${target.mode === 'relic' && target.relicId === id
                          ? 'border-emerald-300 text-emerald-100 bg-emerald-900/40'
                          : 'border-white/15 text-gray-300'
                        }`}
                      >
                        {getRelicById(id)?.name || id}
                      </button>
                    ))
                  )}

                  {item.type === 'remove' && state.inventory.length > 0 && (
                    <button
                      onClick={() => setTarget({ mode: 'remove', instanceId: state.inventory[0].instanceId })}
                      className="px-2 py-1 rounded border border-white/15 text-xs text-gray-300"
                    >
                      자동 제거 대상: {getCardById(state.inventory[0].cardId)?.name}
                    </button>
                  )}

                  <button
                    onClick={() => buy(item.id)}
                    disabled={!canBuy || (item.type === 'relic' && state.relics.length >= 3 && target.mode !== 'relic')}
                    className={`px-4 py-2 rounded-lg font-bold ${
                      canBuy && (item.type !== 'relic' || state.relics.length < 3 || target.mode === 'relic')
                        ? 'bg-emerald-600'
                        : 'bg-gray-700'
                    }`}
                  >
                    구매
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => router.push('/roguelike/map')}
          className="ui-btn ui-btn-neutral w-full py-3"
        >
          맵으로 복귀
        </button>
      </div>
    </div>
  );
}
