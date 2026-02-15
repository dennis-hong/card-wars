'use client';

import { useMemo, useState } from 'react';
import { Suspense } from 'react';
import { Card, Deck, Lane, OwnedCard } from '@/types/game';
import { useRouter, useSearchParams } from 'next/navigation';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';
import CardDetailModal from '@/components/card/CardDetailModal';
import DeckFormation from '@/components/roguelike/DeckFormation';
import { getCardById } from '@/data/cards';
import { useRunContext } from '@/context/run-context';
import { buildAutoDeckFromInventory } from '@/lib/roguelike/auto-deck';

type DeckViewMode = 'hub' | 'recommend' | 'manual';

export const dynamic = 'force-dynamic';

const LANE_LABELS: Record<Lane, string> = {
  front: '전위',
  mid: '중위',
  back: '후위',
};

export default function RoguelikeLandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen ui-page bg-gray-950 flex items-center justify-center text-white">로딩 중...</div>}>
      <RoguelikeLandingPageContent />
    </Suspense>
  );
}

function RoguelikeLandingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    state,
    loaded,
    startNewRun,
    clearRun,
    saveDeck,
    goToMap,
  } = useRunContext();

  const isPracticeMode = searchParams.get('mode') === 'practice';
  const initialMode = useMemo(
    () => {
      const mode = searchParams.get('mode');
      if (mode === 'manual') return 'manual';
      if (mode === 'recommend') return 'recommend';
      return 'hub';
    },
    [searchParams],
  );

  const [viewMode, setViewMode] = useState<DeckViewMode>(initialMode);
  const [detailTarget, setDetailTarget] = useState<{ card: Card; owned: OwnedCard } | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const boosterPath = isPracticeMode ? '/roguelike/booster?mode=practice' : '/roguelike/booster';
  const exitTarget = isPracticeMode ? '/battle' : '/roguelike/map';

  const isRunActive = useMemo(
    () => state.phase !== 'idle' && state.phase !== 'ended',
    [state.phase]
  );
  const hasUnopenedStarterPacks = useMemo(
    () => state.openedStarterPacks.some((pack) => !pack.opened),
    [state.openedStarterPacks]
  );
  const needsStarterPackOpen = useMemo(
    () => isRunActive && (state.phase === 'opening' || hasUnopenedStarterPacks),
    [hasUnopenedStarterPacks, isRunActive, state.phase]
  );
  const needsDeckBuild = useMemo(() => state.phase === 'deck_build', [state.phase]);
  const canContinue = useMemo(
    () => isRunActive && !needsStarterPackOpen && !needsDeckBuild,
    [isRunActive, needsDeckBuild, needsStarterPackOpen]
  );

  const effectiveViewMode: DeckViewMode = needsDeckBuild && viewMode === 'hub'
    ? 'recommend'
    : viewMode;

  const recommendedDeck = useMemo(
    () => buildAutoDeckFromInventory(state.inventory, {
      deckId: state.deck.id || 'auto-roguelike',
      deckName: '권장 편성',
    }),
    [state.deck.id, state.inventory]
  );
  const manualDeck = needsDeckBuild ? (recommendedDeck ?? state.deck) : state.deck;
  const manualDeckSeed = `${manualDeck.id}-${manualDeck.warriors.map((warrior) => warrior.instanceId).join(',')}-${manualDeck.tactics.join(',')}`;

  const runInfoText = useMemo(() => {
    return `Act ${state.currentAct}`;
  }, [state.currentAct]);

  const inventorySummary = useMemo(() => {
    let warriors = 0;
    let tactics = 0;

    for (const owned of state.inventory) {
      const card = getCardById(owned.cardId);
      if (!card) continue;
      if (card.type === 'warrior') warriors += 1;
      if (card.type === 'tactic') tactics += 1;
    }

    return {
      total: state.inventory.length,
      warriors,
      tactics,
    };
  }, [state.inventory]);

  const deckWarriorLabels = useMemo(() => {
    return state.deck.warriors.map((slot) => {
      const owned = state.inventory.find((entry) => entry.instanceId === slot.instanceId);
      const card = owned ? getCardById(owned.cardId) : null;
      return `${LANE_LABELS[slot.lane]} · ${card?.name || '알 수 없는 카드'}`;
    });
  }, [state.deck.warriors, state.inventory]);

  const deckTacticLabels = useMemo(() => {
    return state.deck.tactics.map((instanceId) => {
      const owned = state.inventory.find((entry) => entry.instanceId === instanceId);
      const card = owned ? getCardById(owned.cardId) : null;
      return card?.name || '알 수 없는 카드';
    });
  }, [state.deck.tactics, state.inventory]);
  const detailOwnedCount = useMemo(() => {
    if (!detailTarget) return 0;
    return state.inventory.filter((entry) => entry.cardId === detailTarget.card.id).length;
  }, [detailTarget, state.inventory]);

  const handleStartNew = () => {
    if (isRunActive) {
      setShowResetModal(true);
      return;
    }
    startNewRun();
    router.push(boosterPath);
  };

  const handleConfirmReset = () => {
    clearRun();
    setShowResetModal(false);
    startNewRun();
    router.push(boosterPath);
  };

  const handleCancelReset = () => {
    setShowResetModal(false);
  };

  const handleContinue = () => {
    router.push(exitTarget);
  };

  const handleOpenStarterPacks = () => {
    router.push(boosterPath);
  };

  const handleUseRecommended = (deck: Deck | null) => {
    if (!deck) return;
    saveDeck(deck);
    if (isPracticeMode) {
      router.push('/battle');
      return;
    }
    goToMap();
  };

  const handleSaveManualDeck = (deck: Deck) => {
    saveDeck(deck);
    if (isPracticeMode) {
      router.push('/battle');
      return;
    }
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
    <div className="h-[100dvh] overflow-y-auto ui-page bg-gray-950">
      <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pb-24 pt-5">
        <section className="mb-4 rounded-2xl border border-white/15 bg-black/35 p-4 backdrop-blur-sm animate-[fadeIn_280ms_ease]">
          <h1 className="text-2xl font-black text-white">
            {isPracticeMode ? '연습 대전 준비' : '탐험 준비'}
          </h1>
          <p className="text-sm text-gray-300 mt-1">
            {canContinue && '현재 덱과 카드 상태를 확인한 뒤 이어서 진행하세요.'}
            {!canContinue && needsStarterPackOpen && '시작팩을 모두 개봉한 뒤 덱을 편성합니다.'}
            {!canContinue && needsDeckBuild && (
              isPracticeMode ? '권장 덱을 확인하거나 직접 편성하고 대전하세요.' : '권장 덱을 확인하거나 직접 편성하고 출발하세요.'
            )}
            {!isRunActive && (
              isPracticeMode ? '시작팩 개봉과 덱 편성을 마친 후 연습 대전이 시작됩니다.' : '시작팩 개봉과 덱 편성을 마친 후 탐험이 시작됩니다.'
            )}
          </p>
        </section>

        {isRunActive && (
          <section className="mb-4 rounded-2xl border border-white/15 bg-black/35 p-4 animate-[fadeIn_260ms_ease]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {isPracticeMode ? '연습 상태' : '원정 상태'}
              </h2>
              <span className="text-xs text-amber-200">{runInfoText}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-black/30 p-2">
                <div className="text-lg font-black text-cyan-300">{inventorySummary.total}</div>
                <div className="text-gray-300">보유 카드</div>
              </div>
              <div className="rounded-lg bg-black/30 p-2">
                <div className="text-lg font-black text-emerald-300">{inventorySummary.warriors}</div>
                <div className="text-gray-300">무장</div>
              </div>
              <div className="rounded-lg bg-black/30 p-2">
                <div className="text-lg font-black text-orange-300">{inventorySummary.tactics}</div>
                <div className="text-gray-300">전법</div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="text-xs font-bold text-gray-300">현재 덱</p>
              <div className="mt-2 space-y-1 text-xs text-amber-100">
                {deckWarriorLabels.length > 0 ? (
                  deckWarriorLabels.map((label, index) => (
                    <p key={`${label}-${index}`}>{label}</p>
                  ))
                ) : (
                  <p className="text-gray-400">배치된 무장이 없습니다.</p>
                )}
                {deckTacticLabels.length > 0 ? (
                  deckTacticLabels.map((label, index) => (
                    <p key={`${label}-${index}`}>전법 · {label}</p>
                  ))
                ) : (
                  <p className="text-gray-500">전법이 비어 있습니다.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {!isRunActive && (
          <button
            onClick={handleStartNew}
            className="w-full animate-[slideUp_300ms_ease] rounded-xl bg-gradient-to-r from-red-700 to-amber-600 text-white font-black py-5 min-h-[64px] shadow-lg shadow-red-900/40 text-lg"
          >
            {isPracticeMode ? '⚔️ 연습 시작' : '🗺️ 탐험 시작'}
          </button>
        )}

        {needsStarterPackOpen && (
          <section className="mt-2 rounded-2xl border border-amber-500/30 bg-black/35 p-4 animate-[fadeIn_220ms_ease]">
            <h2 className="text-lg font-black text-white">시작팩 개봉 필요</h2>
            <p className="mt-1 text-sm text-gray-300">기존 부스터 오픈 화면에서 시작팩을 모두 개봉해야 다음 단계로 진행됩니다.</p>
            <button
              onClick={handleOpenStarterPacks}
              className="ui-btn ui-btn-danger mt-3 w-full min-h-[48px] py-3"
            >
              📦 시작팩 열기
            </button>
          </section>
        )}

        {canContinue && effectiveViewMode === 'hub' && (
          <section className="mt-2 space-y-3 animate-[fadeIn_240ms_ease]">
            <button
              onClick={handleContinue}
              className="ui-btn ui-btn-primary w-full min-h-[48px] py-3"
            >
              {isPracticeMode ? '연습 계속하기' : '탐험 계속하기'}
            </button>
            <button
              onClick={() => setViewMode('manual')}
              className="ui-btn ui-btn-neutral w-full min-h-[48px] py-3"
            >
              덱 확인/수정
            </button>
            <button
              onClick={() => setViewMode('recommend')}
              className="ui-btn ui-btn-neutral w-full min-h-[48px] py-3"
            >
              추천 덱 다시 보기
            </button>
          </section>
        )}

        {effectiveViewMode === 'recommend' && !needsStarterPackOpen && (
          <section className="mt-4 animate-[slideUp_240ms_ease]">
            <div className="rounded-2xl border border-amber-400/30 bg-black/35 p-4">
              <h2 className="text-lg text-white font-black">권장 편성</h2>
              <p className="mt-1 text-sm text-gray-300">자동 추천 덱을 확인하고 필요하면 직접 편성으로 조정하세요.</p>

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
                        <WarriorCardView
                          card={cardData}
                          owned={owned}
                          size="sm"
                          onClick={() => setDetailTarget({ card: cardData, owned })}
                        />
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
                      <TacticCardView
                        card={cardData}
                        owned={owned}
                        size="sm"
                        onClick={() => setDetailTarget({ card: cardData, owned })}
                      />
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
                {isPracticeMode ? '이 덱으로 대전하기' : '이 덱으로 출발!'}
              </button>
              <button
                onClick={() => setViewMode('manual')}
                className="ui-btn ui-btn-neutral min-h-[48px] py-3"
              >
                직접 편성
              </button>
              {canContinue && (
                <button
                  onClick={() => setViewMode('hub')}
                  className="ui-btn ui-btn-neutral min-h-[48px] py-3"
                >
                  {isPracticeMode ? '준비 화면으로' : '이어하기 화면으로'}
                </button>
              )}
            </div>
          </section>
        )}

        {effectiveViewMode === 'manual' && !needsStarterPackOpen && (
          <section className="mt-4 animate-[slideUp_220ms_ease]">
            <div className="mb-3 rounded-2xl border border-amber-400/20 bg-black/35 p-3">
              <h2 className="mb-1 text-lg text-white font-black">직접 편성</h2>
              <p className="text-sm text-gray-300">
                {isPracticeMode
                  ? '현재 보유 카드로 덱을 수정하고 대전하세요.'
                  : '현재 보유 카드로 덱을 수정하고 탐험을 시작하세요.'}
              </p>
            </div>
            <DeckFormation
              key={manualDeckSeed}
              deck={manualDeck}
              inventory={state.inventory}
              onSave={handleSaveManualDeck}
              actionLabel={isPracticeMode ? '덱 확정 후 전투 시작' : '덱 확정 후 맵 진입'}
            />
            <button
              onClick={() => setViewMode(canContinue ? 'hub' : 'recommend')}
              className="ui-btn ui-btn-neutral mt-3 w-full py-3"
            >
              {canContinue
                ? (isPracticeMode ? '준비 화면으로' : '이어하기 화면으로')
                : '권장 편성으로 돌아가기'}
            </button>
          </section>
        )}

        <CardDetailModal
          card={detailTarget?.card ?? null}
          owned={detailTarget?.owned ?? null}
          ownedCount={detailOwnedCount}
          sourceTag={isPracticeMode ? '연습 편성' : '권장 편성'}
          onClose={() => setDetailTarget(null)}
        />

        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-amber-300/30 bg-gradient-to-b from-[#1d263f] to-[#0a1122] p-5">
              <div className="mb-2 text-center text-3xl">🗺️</div>
              <h2 className="text-center text-lg font-black text-amber-100">
                {isPracticeMode ? '연습을 초기화할까요?' : '탐험을 초기화할까요?'}
              </h2>
              <p className="mt-2 text-center text-sm text-gray-300">
                {isPracticeMode
                  ? '현재 연습 기록이 정리되고 새 시작팩부터 다시 진행됩니다.'
                  : '현재 탐험 기록이 정리되고 새 시작팩부터 다시 진행됩니다.'}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCancelReset}
                  className="ui-btn ui-btn-neutral py-2.5 text-sm"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="ui-btn ui-btn-primary py-2.5 text-sm"
                >
                  새로 시작
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
