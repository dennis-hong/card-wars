'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { openPack } from '@/lib/gacha';
import { Card } from '@/types/game';
import { getCardById } from '@/data/cards';
import RunHeader from '@/components/roguelike/RunHeader';
import RelicChoice from '@/components/roguelike/RelicChoice';
import { useRunContext } from '@/context/run-context';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';

export default function RoguelikeRewardPage() {
  const router = useRouter();
  const {
    state,
    claimRewardCards,
    grantRelic,
    acknowledgeReward,
  } = useRunContext();

  const reward = state.pendingReward;
  const [openedCards, setOpenedCards] = useState<Card[] | null>(null);
  const [selectedRelic, setSelectedRelic] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  const canProceed = !!reward || !claimed;

  const parsedCards = useMemo(() => {
    if (!openedCards) return [] as Card[];
    return openedCards;
  }, [openedCards]);

  if (!reward) {
    return (
      <div className="min-h-screen ui-page text-white flex flex-col items-center justify-center p-4">
        <div className="text-white text-lg mb-3">보상이 존재하지 않습니다.</div>
        <button
          onClick={() => router.push('/roguelike/map')}
          className="ui-btn ui-btn-primary w-full py-3"
        >
          맵으로
        </button>
      </div>
    );
  }

  const handleOpenPack = () => {
    if (openedCards) return;
    setOpenedCards(openPack(reward.packType));
  };

  const handleClaim = () => {
    if (claimed) {
      acknowledgeReward();
      return;
    }

    if (openedCards && openedCards.length > 0) {
      claimRewardCards(openedCards);
    }

    if (reward.relicOptions.length > 0 && selectedRelic) {
      grantRelic(selectedRelic);
    }

    if (openedCards === null) {
      acknowledgeReward();
      return;
    }

    setClaimed(true);
    acknowledgeReward();
  };

  const hasRelicChoice = reward.relicOptions.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <RunHeader />

      <div className="p-4">
        <div className="rounded-2xl border border-white/15 bg-black/35 p-4 mb-4">
          <h1 className="text-lg font-black mb-1">전투 보상</h1>
          <div className="text-sm text-gray-300">
            {reward.sourceType === 'boss' ? '보스 처치 보상' : '전투 승리 보상'}
          </div>
          <div className="mt-2 text-sm">
            패키지: {reward.packType}팩 · 골드 {reward.gold}G 획득
          </div>
        </div>

        {!openedCards ? (
          <button onClick={handleOpenPack} className="ui-btn ui-btn-primary w-full py-4 text-lg">
            패키지 열기
          </button>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {parsedCards.map((card, idx) => {
                const cardData = getCardById(card.id);
                if (!cardData) return null;
                return (
                  <div key={`${card.id}-${idx}`} className="rounded-xl border border-white/10 bg-black/30 p-1">
                    {cardData.type === 'warrior' ? (
                      <WarriorCardView card={cardData} size="sm" owned={undefined} />
                    ) : (
                      <TacticCardView card={cardData} size="sm" owned={undefined} />
                    )}
                  </div>
                );
              })}
            </div>

            {hasRelicChoice && (
              <RelicChoice
                relicIds={reward.relicOptions}
                selectedRelicId={selectedRelic}
                onSelect={(relicId) => setSelectedRelic(relicId)}
                label="보물 선택 (선택)"
              />
            )}

            {hasRelicChoice && !selectedRelic && (
              <div className="text-xs text-amber-300">보물을 선택하지 않으면 미획득됩니다.</div>
            )}

            <button
              disabled={!canProceed}
              onClick={handleClaim}
              className={`w-full py-3 rounded-xl font-bold ${
                canProceed ? 'ui-btn ui-btn-primary' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {claimed ? '확인' : '보상 획득 후 진행'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
