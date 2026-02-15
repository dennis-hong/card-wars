'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import RunHeader from '@/components/roguelike/RunHeader';
import RunMap from '@/components/roguelike/RunMap';
import { useRunContext } from '@/context/run-context';

export default function RoguelikeMapPage() {
  const router = useRouter();
  const {
    state,
    getCurrentNodeReachable,
    selectNode,
    goHome,
  } = useRunContext();

  const reachable = useMemo(() => getCurrentNodeReachable(), [getCurrentNodeReachable]);

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
      <div className="p-3 space-y-3">
        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-200">
          현재 노드: {state.currentNodeId ?? '대기'}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="text-sm font-bold text-white mb-2">맵</div>
          <RunMap state={state} selectableNodes={reachable} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}
