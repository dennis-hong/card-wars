'use client';

import { AnimatePresence, motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

const pageTransition = {
  type: 'spring' as const,
  stiffness: 240,
  damping: 28,
  mass: 0.85,
};

export default function PageTransitionLayer({ children }: Props) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="relative z-10 min-h-screen"
        initial={{ opacity: 0, y: 18, filter: 'blur(3px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -10, filter: 'blur(2px)' }}
        transition={pageTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
