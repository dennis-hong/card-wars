'use client';

import Link from 'next/link';
import { useRunContext } from '@/context/run-context';
import RelicDisplay from '@/components/roguelike/RelicDisplay';

export default function RunHeader() {
  const { state } = useRunContext();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-gray-950/95 backdrop-blur">
      <div className="mx-auto max-w-5xl px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2 text-white">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]">Act {state.currentAct}</span>
            <span>💰 {state.gold}G</span>
            <span>경로 {state.currentNodeId ? state.currentNodeId : '미정'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/collection"
              className="rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-xs text-gray-200 hover:text-white"
            >
              카드 도감
            </Link>
            <Link
              href="/roguelike?mode=manual"
              className="rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-xs text-gray-200 hover:text-white"
            >
              덱 편집
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-xs text-gray-200 hover:text-white"
            >
              홈
            </Link>
            <Link
              href="/roguelike/map"
              className="rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-xs text-gray-200 hover:text-white"
            >
              맵으로
            </Link>
          </div>
        </div>
        <div className="mt-2">
          <RelicDisplay relicIds={state.relics} size="sm" />
        </div>
      </div>
    </header>
  );
}
