'use client';

import Link from 'next/link';
import { useRunContext } from '@/context/run-context';
import RelicDisplay from '@/components/roguelike/RelicDisplay';

export default function RunHeader() {
  const { state } = useRunContext();
  const hpPercent = state.maxTeamHp <= 0 ? 0 : Math.round((state.teamHp / state.maxTeamHp) * 100);
  const hpColor =
    hpPercent <= 25 ? 'from-red-700 to-red-900' : hpPercent <= 50 ? 'from-amber-700 to-amber-900' : 'from-green-700 to-emerald-900';

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
          <div className="mb-1 flex items-center justify-between text-xs text-gray-300">
            <span>❤️ 체력</span>
            <span>
              {state.teamHp}/{state.maxTeamHp}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${hpColor} transition-all`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <div className="mt-2">
            <RelicDisplay relicIds={state.relics} size="sm" />
          </div>
        </div>
      </div>
    </header>
  );
}
