'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Deck, Lane } from '@/types/game';
import { useRouter } from 'next/navigation';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';
import DeckFormation from '@/components/roguelike/DeckFormation';
import { getCardById } from '@/data/cards';
import { useRunContext } from '@/context/run-context';
import { buildAutoDeckFromInventory } from '@/lib/roguelike/auto-deck';

type LandingStep = 'idle' | 'opening' | 'reveal' | 'recommend' | 'manual';

const LANE_LABELS: Record<Lane, string> = {
  front: '전위',
  mid: '중위',
  back: '후위',
};

export default function RoguelikeLandingPage() {
  const router = useRouter();
  const {
    state,
    loaded,
    startNewRun,
    clearRun,
    openStarterPack,
    saveDeck,
    goToMap,
    ensureStarterComposition,
  } = useRunContext();

  const [step, setStep] = useState<LandingStep>('idle');
  const [openedCards, setOpenedCards] = useState<Card[]>([]);
  const openingRef = useRef(false);

  const canContinue = useMemo(
    () => state.phase !== 'idle' && state.phase !== 'ended',
    [state.phase]
  );

  const recommendedDeck = useMemo(
    () => buildAutoDeckFromInventory(state.inventory, {
      deckId: state.deck.id || 'auto-roguelike',
      deckName: '권장 편성',
    }),
    [state.deck.id, state.inventory]
  );

  const runInfoText = useMemo(() => {
    return `Act ${state.currentAct} · HP ${state.teamHp}/${state.maxTeamHp}`;
  }, [state.currentAct, state.maxTeamHp, state.teamHp]);

  useEffect(() => {
    if (step !== 'opening') {
      openingRef.current = false;
      return;
    }

    if (state.phase !== 'opening') {
      if (state.phase === 'deck_build') {
        setStep('recommend');
      }
      return;
    }

    if (openingRef.current) {
      return;
    }

    const unopened = state.openedStarterPacks.filter((pack) => !pack.opened);
    if (unopened.length === 0) {
      setStep('recommend');
      return;
    }

    openingRef.current = true;
    const cards: Card[] = [];

    for (const pack of unopened) {
      const opened = openStarterPack(pack.id);
      if (opened) {
        cards.push(...opened);
      }
    }

    ensureStarterComposition();
    setOpenedCards(cards);
    setStep('reveal');
  }, [ensureStarterComposition, openStarterPack, state.openedStarterPacks, state.phase, step]);

  useEffect(() => {
    if (step !== 'reveal') return;

    const timer = window.setTimeout(() => setStep('recommend'), 1400);
    return () => window.clearTimeout(timer);
  }, [step]);

  const handleStartNew = () => {
    if (canContinue && !window.confirm('현재 탐험을 초기화하고 새로 시작할까요?')) {
      return;
    }

    if (canContinue) {
      clearRun();
    }

    setOpenedCards([]);
    openingRef.current = false;
    setStep('opening');
    startNewRun();
  };

  const handleContinue = () => {
    router.push('/roguelike/map');
  };

  const handleUseRecommended = (deck: Deck | null) => {
    if (!deck) return;
    saveDeck(deck);
    goToMap();
  };

  const handleSaveManualDeck = (deck: Deck) => {
    saveDeck(deck);
    goToMap();
  };

  if (!loaded) {
    return (
      <div className="min-h-screen ui-page bg-gray-950 flex items-center justify-center text-white">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen ui-page bg-gray-950">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-32 pt-5">
        <section className="mb-4 rounded-2xl border border-white/15 bg-black/35 p-4 backdrop-blur-sm animate-[fadeIn_280ms_ease]">
          <h1 className="text-2xl font-black text-white">탐험 시작</h1>
          <p className="text-sm text-gray-300 mt-1">원정대 원클릭 배치로 바로 이동하세요.</p>
        </section>

        {canContinue && step === 'idle' && (
          <section className="animate-[fadeIn_260ms_ease] space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4">
            <h2 className="text-lg font-bold text-white">이어하기</h2>
            <p className="text-amber-200">{runInfoText}</p>
            <button
              onClick={handleContinue}
              className="ui-btn ui-btn-primary w-full py-3 min-h-[44px]"
            >
              탐험 계속하기
            </button>
          </section>
        )}

        {!canContinue && step === 'idle' && (
          <button
            onClick={handleStartNew}
            className="w-full animate-[slideUp_300ms_ease] rounded-xl bg-gradient-to-r from-red-700 to-amber-600 text-white font-black py-5 min-h-[64px] shadow-lg shadow-red-900/40 text-lg"
          >
            🗺️ 탐험 시작
          </button>
        )}

        {step === 'opening' && (
          <section className="mt-4 rounded-2xl border border-white/15 bg-black/35 p-5 text-center animate-[fadeIn_220ms_ease]">
            <div className="mb-2 text-amber-300">시작팩을 개봉하는 중...</div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
              <div className="h-full w-3/4 animate-pulse rounded-full bg-amber-400" />
            </div>
          </section>
        )}

        {step === 'reveal' && (
          <section className="mt-4 animate-[fadeIn_260ms_ease]">
            <h2 className="mb-3 text-center text-white font-bold">시작팩 오픈 완료</h2>
            <div className="grid grid-cols-3 gap-2">
              {openedCards.map((card, idx) => {
                const isWarrior = card.type === 'warrior';
                if (isWarrior) {
                  return (
                    <div
                      key={`${card.id}-${idx}`}
                      className="animate-[cardSwoosh_450ms_ease-out_forwards]"
                      style={{ animationDelay: `${idx * 90}ms` }}
                    >
                      <WarriorCardView card={card} size="sm" />
                    </div>
                  );
                }

                return (
                  <div
                    key={`${card.id}-${idx}`}
                    className="animate-[cardSwoosh_450ms_ease-out_forwards]"
                    style={{ animationDelay: `${idx * 90}ms` }}
                  >
                    <TacticCardView card={card} size="sm" />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {step === 'recommend' && (
          <section className="mt-4 animate-[slideUp_240ms_ease]">
            <div className="rounded-2xl border border-amber-400/30 bg-black/35 p-4">
              <h2 className="text-lg text-white font-black">권장 편성</h2>
              <p className="mt-1 text-sm text-gray-300">탐험용 강력한 편성으로 바로 출발할 수 있습니다.</p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {recommendedDeck ? (
                  recommendedDeck.warriors.map((slot) => {
                    const owned = state.inventory.find((entry) => entry.instanceId === slot.instanceId);
                    const cardData = owned ? getCardById(owned.cardId) : null;

                    if (!owned || !cardData || cardData.type !== 'warrior') {
                      return (
                        <div
                          key={slot.instanceId}
                          className="rounded-lg border border-dashed border-white/20 bg-black/20 min-h-44 flex items-center justify-center text-[11px] text-gray-300"
                        >
                          카드 미확인
                        </div>
                      );
                    }

                    return (
                      <div key={slot.instanceId} className="space-y-1">
                        <WarriorCardView card={cardData} owned={owned} size="sm" />
                        <p className="text-center text-[11px] text-amber-200">{LANE_LABELS[slot.lane]}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="col-span-3 text-sm text-yellow-300">추천 편성을 계산할 카드가 부족합니다.</p>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {(recommendedDeck?.tactics ?? []).map((instanceId) => {
                  const owned = state.inventory.find((entry) => entry.instanceId === instanceId);
                  const cardData = owned ? getCardById(owned.cardId) : null;
                  if (!owned || !cardData || cardData.type !== 'tactic') return null;
                  return (
                    <div key={instanceId}>
                      <TacticCardView card={cardData} owned={owned} size="sm" />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 grid gap-3">
              <button
                onClick={() => handleUseRecommended(recommendedDeck)}
                className="ui-btn ui-btn-danger min-h-[48px] py-3"
                disabled={!recommendedDeck}
              >
                이 덱으로 출발!
              </button>
              <button
                onClick={() => setStep('manual')}
                className="ui-btn ui-btn-neutral min-h-[48px] py-3"
              >
                직접 편성
              </button>
            </div>
          </section>
        )}

        {step === 'manual' && (
          <section className="mt-4 animate-[slideUp_220ms_ease]">
            <div className="mb-3 rounded-2xl border border-amber-400/20 bg-black/35 p-3">
              <h2 className="mb-1 text-lg text-white font-black">직접 편성</h2>
              <p className="text-sm text-gray-300">권장 편성에서 원하는 카드만 교체해서 시작하세요.</p>
            </div>
            <DeckFormation deck={recommendedDeck ?? state.deck} inventory={state.inventory} onSave={handleSaveManualDeck} />
            <button
              onClick={() => setStep('recommend')}
              className="ui-btn ui-btn-neutral mt-3 w-full py-3"
            >
              권장 편성으로 돌아가기
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
