'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import RunHeader from '@/components/roguelike/RunHeader';
import RunMap from '@/components/roguelike/RunMap';
import { useRunContext } from '@/context/run-context';
import { RunAct } from '@/lib/roguelike/run-types';

const ACT_TITLES: Record<RunAct, string> = {
  1: '황건토벌',
  2: '적벽대전',
  3: '장안 공략',
};

export default function RoguelikeMapPage() {
  const router = useRouter();
  const {
    state,
    loaded,
    getCurrentNodeReachable,
    selectNode,
    goHome,
  } = useRunContext();

  const reachable = useMemo(() => getCurrentNodeReachable(), [getCurrentNodeReachable]);
  const actTitle = ACT_TITLES[state.currentAct] ?? '황건토벌';

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  if (!state.map) {
    return (
      <div className="min-h-screen ui-page flex items-center justify-center p-4 text-white">
        <button onClick={() => goHome()} className="ui-btn ui-btn-danger px-6 py-3">
          맵 없음 · 종료
        </button>
      </div>
    );
  }

  const onSelect = (nodeId: string) => {
    const node = state.map?.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    if (!selectNode(nodeId)) return;

    if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') {
      router.push('/roguelike/battle');
      return;
    }
    if (node.type === 'event') {
      router.push('/roguelike/event');
      return;
    }
    if (node.type === 'shop') {
      router.push('/roguelike/shop');
      return;
    }
    if (node.type === 'rest') {
      router.push('/roguelike/rest');
      return;
    }

    router.push('/roguelike/map');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <RunHeader />
      <div className="px-3 pt-3 pb-2">
        <h1 className="text-lg font-extrabold tracking-wide text-amber-100">Act {state.currentAct}: {actTitle}</h1>
      </div>
      <div className="h-[calc(100vh-64px)]">
        <div className="h-full border border-white/10 bg-black/30">
          <RunMap state={state} selectableNodes={reachable} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}
