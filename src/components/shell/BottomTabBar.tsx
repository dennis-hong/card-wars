'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useGameStateContext } from '@/context/GameStateContext';

const TABS = [
  { href: '/collection', label: '카드', icon: '🃏' },
  { href: '/booster', label: '팩', icon: '📦' },
  { href: '/titles', label: '칭호', icon: '🏆' },
  { href: '/settings', label: '설정', icon: '⚙️' },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const { state } = useGameStateContext();
  const unopenedPackCount = useMemo(
    () => state.boosterPacks.filter((pack) => !pack.opened).length,
    [state.boosterPacks]
  );

  const isVisible = !pathname?.startsWith('/roguelike');

  if (!isVisible) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-black/60 backdrop-blur-md"
    >
      <div className="mx-auto max-w-md grid grid-cols-4 gap-1 px-2 py-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const showPackBadge = tab.href === '/booster' && unopenedPackCount > 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-colors ${active
                ? 'text-amber-300'
                : 'text-white/80'
              } ${active ? 'bg-amber-400/12 border border-amber-400/30' : 'hover:bg-white/5'}`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
              {showPackBadge && (
                <span className="absolute -top-1 right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                  {unopenedPackCount}
                </span>
              )}
            </Link>
          );
            })}
      </div>
    </nav>
  );
}
