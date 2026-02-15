'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRunContext } from '@/context/run-context';
import RunSummary from '@/components/roguelike/RunSummary';

export default function RoguelikeSummaryPage() {
  const router = useRouter();
  const {
    state,
    loaded,
    startNewRun,
  } = useRunContext();
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const result = useMemo(() => {
    if (state.result === 'win') return 'win';
    if (state.result === 'loss') return 'loss';
    return 'draw';
  }, [state.result]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [state.startedAt]);

  const handleConfirmRestart = () => {
    startNewRun();
    setShowRestartModal(false);
    router.push('/roguelike');
  };

  if (!loaded) {
    return (
      <div className="min-h-screen ui-page flex items-center justify-center p-4">
        <div className="text-white text-center">로딩 중...</div>
      </div>
    );
  }

  if (state.phase !== 'ended' && state.result === null) {
    return (
      <div className="min-h-screen ui-page flex items-center justify-center p-4">
        <div className="text-white text-center space-y-3">
          <div>아직 전투 결과가 확정되지 않았습니다.</div>
          <button
            onClick={() => router.push('/roguelike/map')}
            className="ui-btn ui-btn-primary py-3 px-4"
          >
            맵으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <RunSummary
        runResult={result}
        act={state.currentAct}
        startedAt={state.startedAt}
        relicIds={state.relics}
        deck={state.deck}
        inventory={state.inventory}
        playTimeMs={Math.max(0, now - state.startedAt)}
        stats={{
          battlesWon: state.stats.battlesWon,
          elitesCleared: state.stats.elitesCleared,
          goldEarned: state.stats.goldEarned,
          relicsCollected: state.stats.relicsCollected,
          cardsObtained: state.stats.cardsObtained,
          battlesFought: state.stats.battlesFought,
          floorsCleared: state.stats.floorsCleared,
        }}
        onRetry={() => setShowRestartModal(true)}
      />

      {showRestartModal && result === 'loss' && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-amber-300/30 bg-gradient-to-b from-[#1d263f] to-[#0a1122] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.55)]">
            <div className="mb-2 text-center text-3xl">🧭</div>
            <h2 className="text-center text-lg font-black text-amber-100">새로운 원정을 시작할까요?</h2>
            <p className="mt-2 text-center text-sm text-gray-300">
              현재 원정 기록이 정리되고 새 시작팩부터 다시 진행됩니다.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowRestartModal(false)}
                className="ui-btn ui-btn-neutral py-2.5 text-sm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmRestart}
                className="ui-btn ui-btn-primary py-2.5 text-sm"
              >
                새 탐험 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
