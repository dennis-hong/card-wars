'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { openPack } from '@/lib/gacha';
import { Card, PACK_INFO } from '@/types/game';
import { getCardById } from '@/data/cards';
import RunHeader from '@/components/roguelike/RunHeader';
import RelicChoice from '@/components/roguelike/RelicChoice';
import { useRunContext } from '@/context/run-context';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';

export default function RoguelikeRewardPage() {
  const {
    state,
    claimRewardCards,
    grantRelic,
    acknowledgeReward,
  } = useRunContext();

  const reward = state.pendingReward;
  const rewardInfo = reward ? PACK_INFO[reward.packType] : null;
  const [openedCards, setOpenedCards] = useState<Card[] | null>(null);
  const [selectedRelic, setSelectedRelic] = useState<string | null>(null);
  const [chestOpened, setChestOpened] = useState(false);
  const [burst, setBurst] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const parsedCards = useMemo<Card[]>(() => {
    if (!openedCards) return [] as Card[];
    return openedCards;
  }, [openedCards]);

  if (!reward) {
    return (
      <div className="min-h-screen ui-page text-white flex flex-col items-center justify-center p-4">
        <div className="text-white text-lg mb-3">보상이 존재하지 않습니다.</div>
        <button
          onClick={() => acknowledgeReward('/roguelike/map')}
          className="ui-btn ui-btn-primary w-full py-3"
        >
          맵으로
        </button>
      </div>
    );
  }

  const hasRelicChoice = reward.relicOptions.length > 0;

  const handleOpenTreasure = () => {
    if (chestOpened) return;
    setChestOpened(true);
    setBurst(true);
    window.setTimeout(() => setBurst(false), 520);
  };

  const handleOpenPack = () => {
    if (openedCards) return;
    setOpenedCards(openPack(reward.packType));
  };

  const finalizeReward = (target: 'map' | 'deck') => {
    if (claiming) return;
    setClaiming(true);

    const cardsToClaim = openedCards ?? openPack(reward.packType);
    if (cardsToClaim.length > 0) {
      claimRewardCards(cardsToClaim);
    }
    if (hasRelicChoice && selectedRelic) {
      grantRelic(selectedRelic);
    }

    acknowledgeReward(target === 'deck' ? '/roguelike?mode=manual' : '/roguelike/map');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <RunHeader />
      <div className="mx-auto max-w-3xl p-4 pb-24 space-y-4">
        <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
          <h1 className="text-2xl font-black text-amber-200">전리품 금고</h1>
          <p className="mt-1 text-sm text-gray-300">
            {reward.sourceType === 'boss' ? '보스를 처치하고 금고를 확보했습니다.' : '전투 승리! 전리품 금고를 확보했습니다.'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            획득 보상: {rewardInfo?.name ?? reward.packType} 1개 · 골드 {reward.gold}G
          </p>
        </div>

        {!chestOpened && (
          <motion.div
            className="rounded-2xl border border-amber-300/25 bg-gradient-to-b from-[#2b2b33] to-[#141218] p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-6xl mb-2">🧰</div>
            <div className="text-lg font-black text-amber-100">봉인된 보물 상자</div>
            <div className="mt-1 text-sm text-gray-300">상자를 열면 부스터 팩과 전리품을 확인할 수 있습니다.</div>
            <button
              onClick={handleOpenTreasure}
              className="ui-btn ui-btn-danger mt-4 w-full py-3 text-base"
            >
              보물 상자 열기
            </button>
          </motion.div>
        )}

        {chestOpened && (
          <div className="space-y-4">
            <motion.div
              className="relative rounded-2xl border border-white/15 bg-gradient-to-b from-[#171f34] to-[#0a1020] p-5 overflow-hidden"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {burst && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 50% 40%, ${rewardInfo?.color ?? '#f59e0b'}66 0%, transparent 60%)`,
                  }}
                />
              )}
              <div className="text-center">
                <div className="text-5xl">{burst ? '💥' : '📦'}</div>
                <p className="mt-2 text-amber-100 font-bold">전리품 확보 완료</p>
                <div className="mt-3 flex justify-center gap-2 text-sm">
                  <span
                    className="rounded-full border px-3 py-1 font-bold"
                    style={{ borderColor: `${rewardInfo?.color ?? '#f59e0b'}88`, color: rewardInfo?.color ?? '#f59e0b' }}
                  >
                    {rewardInfo?.name ?? reward.packType} x1
                  </span>
                  <span className="rounded-full border border-yellow-500/50 bg-yellow-900/30 px-3 py-1 font-bold text-yellow-200">
                    💰 {reward.gold}G
                  </span>
                </div>
              </div>

              {!openedCards && (
                <button
                  onClick={handleOpenPack}
                  className="ui-btn ui-btn-primary mt-5 w-full py-3"
                >
                  획득한 팩 개봉
                </button>
              )}
            </motion.div>

            {openedCards && (
              <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
                <h2 className="text-base font-black text-amber-100 mb-3">획득한 카드</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
              </div>
            )}

            {hasRelicChoice && (
              <RelicChoice
                relicIds={reward.relicOptions}
                selectedRelicId={selectedRelic}
                onSelect={(relicId) => setSelectedRelic(relicId)}
                label="보물 선택 (선택)"
              />
            )}

            {hasRelicChoice && !selectedRelic && (
              <div className="text-xs text-amber-300">보물은 선택하지 않아도 진행 가능합니다.</div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={claiming}
                onClick={() => finalizeReward('map')}
                className="ui-btn ui-btn-primary py-3"
              >
                보상 획득 후 진행
              </button>
              <button
                disabled={claiming}
                onClick={() => finalizeReward('deck')}
                className="ui-btn ui-btn-neutral py-3"
              >
                덱 편집 후 진행
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
