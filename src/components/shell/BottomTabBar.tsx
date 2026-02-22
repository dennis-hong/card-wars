'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { motion } from 'motion/react';
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

  const isVisible = !pathname?.startsWith('/roguelike') && pathname !== '/';

  if (!isVisible) {
    return null;
  }

  return (
    <motion.nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-black/62 backdrop-blur-md"
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.8 }}
    >
      <div className="mx-auto max-w-md grid grid-cols-4 gap-1 px-2 py-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const showPackBadge = tab.href === '/booster' && unopenedPackCount > 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative min-h-[44px] rounded-lg px-1.5 py-1 ${
                active ? 'text-amber-200' : 'text-white/80'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="tab-active-bg"
                  className="absolute inset-0 rounded-lg border border-amber-300/40 bg-amber-400/12"
                  transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                />
              )}

              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative z-10 flex h-full flex-col items-center justify-center gap-1"
              >
                <motion.span
                  className="text-lg leading-none"
                  animate={active ? { y: [0, -1.5, 0], scale: [1, 1.12, 1] } : { y: 0, scale: 1 }}
                  transition={{ duration: 0.32, ease: 'easeOut' }}
                >
                  {tab.icon}
                </motion.span>
                <span className="text-[11px] font-bold">{tab.label}</span>
              </motion.div>

              {active && (
                <motion.span
                  layoutId="tab-active-indicator"
                  className="absolute bottom-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200"
                  transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                />
              )}

              {showPackBadge && (
                <motion.span
                  initial={{ scale: 0.75, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                  className="absolute -top-1 right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-[0_0_10px_rgba(239,68,68,0.55)]"
                >
                  {unopenedPackCount}
                </motion.span>
              )}
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
