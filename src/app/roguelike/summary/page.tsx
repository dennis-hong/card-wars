'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRunContext } from '@/context/run-context';
import RunSummary from '@/components/roguelike/RunSummary';

export default function RoguelikeSummaryPage() {
  const router = useRouter();
  const {
    state,
    startNewRun,
  } = useRunContext();

  const result = useMemo(() => {
    if (state.result === 'win') return 'win';
    if (state.result === 'loss') return 'loss';
    return 'draw';
  }, [state.result]);

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
    <RunSummary
      runResult={result}
      act={state.currentAct}
      teamHp={state.teamHp}
      maxTeamHp={state.maxTeamHp}
      startedAt={state.startedAt}
      relicIds={state.relics}
      deck={state.deck}
      inventory={state.inventory}
      playTimeMs={Date.now() - state.startedAt}
      stats={
        {
          battlesWon: state.stats.battlesWon,
          elitesCleared: state.stats.elitesCleared,
          goldEarned: state.stats.goldEarned,
          cardsObtained: state.stats.cardsObtained,
          battlesFought: state.stats.battlesFought,
        }
      }
      onRetry={() => {
        if (!window.confirm('현재 기록을 초기화하고 다시 시작하시겠습니까?')) {
          return;
        }

        startNewRun();
        router.push('/roguelike');
      }}
    />
  );
}
