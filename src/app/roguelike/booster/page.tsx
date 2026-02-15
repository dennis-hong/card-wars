'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BoosterPackView from '@/components/booster/BoosterPackView';
import { useRunContext } from '@/context/run-context';

export const dynamic = 'force-dynamic';

export default function RoguelikeBoosterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen ui-page bg-gray-950 flex items-center justify-center text-white">로딩 중...</div>}>
      <RoguelikeBoosterPageContent />
    </Suspense>
  );
}

function RoguelikeBoosterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    state,
    loaded,
    openStarterPack,
    ensureStarterComposition,
  } = useRunContext();
  const isPracticeMode = searchParams.get('mode') === 'practice';
  const landingPath = isPracticeMode ? '/roguelike?mode=practice' : '/roguelike';
  const [openedInSession, setOpenedInSession] = useState(false);

  const isRunActive = useMemo(
    () => state.phase !== 'idle' && state.phase !== 'ended',
    [state.phase]
  );
  const hasUnopenedPacks = useMemo(
    () => state.openedStarterPacks.some((pack) => !pack.opened),
    [state.openedStarterPacks]
  );
  const ownedCardIds = useMemo(
    () => new Set(state.inventory.map((card) => card.cardId)),
    [state.inventory]
  );
  const [showOpenWarning, setShowOpenWarning] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (!isRunActive) {
      router.replace(landingPath);
      return;
    }
    // Keep the page alive after the last pack is opened so reveal/summary can complete.
    if (!hasUnopenedPacks && !openedInSession) {
      router.replace(landingPath);
    }
  }, [hasUnopenedPacks, isRunActive, loaded, openedInSession, router, landingPath]);

  if (!loaded || !isRunActive) {
    return (
      <div className="min-h-screen ui-page bg-gray-950 flex items-center justify-center text-white">
        로딩 중...
      </div>
    );
  }

  return (
    <>
      <BoosterPackView
        packs={state.openedStarterPacks}
        onOpen={(packId) => {
          const cards = openStarterPack(packId);
          if (cards) {
            setOpenedInSession(true);
          }
          return cards;
        }}
        onComplete={() => {
          if (state.openedStarterPacks.some((pack) => !pack.opened)) {
            setShowOpenWarning(true);
            return;
          }
          ensureStarterComposition();
          router.push(landingPath);
        }}
        ownedCardIds={ownedCardIds}
        ownedCards={state.inventory}
      />
      {showOpenWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-amber-300/30 bg-gradient-to-b from-[#1d263f] to-[#0a1122] p-5">
            <h2 className="text-center text-lg font-black text-amber-100">시작팩을 더 개봉해주세요</h2>
            <p className="mt-2 text-center text-sm text-gray-300">
              덱 편성 화면으로 이동하려면 시작팩을 모두 개봉해야 합니다.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowOpenWarning(false)}
                className="ui-btn ui-btn-neutral w-full py-2.5 text-sm"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
