'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameStateContext } from '@/context/GameStateContext';
import { getTitleById } from '@/data/titles';
import { SFX } from '@/lib/sound';

interface Props {
  children: React.ReactNode;
}

export default function GameToasts({ children }: Props) {
  const {
    newTitleIds,
    dismissNewTitles,
  } = useGameStateContext();

  const hasNewTitles = useMemo(() => newTitleIds.length > 0, [newTitleIds]);

  return (
    <>
      {children}

      <AnimatePresence>
        {hasNewTitles && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/78 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-b from-yellow-900/90 to-gray-900/95 rounded-2xl p-6 max-w-xs w-full text-center border-2 border-yellow-500/50 shadow-2xl shadow-yellow-500/20"
              initial={{ opacity: 0, y: 42, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, mass: 0.8 }}
            >
              <motion.div
                className="text-4xl mb-3"
                initial={{ rotate: -16, scale: 0.7 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              >
                🏆
              </motion.div>
              <div className="text-xl font-black text-yellow-300 mb-4">칭호 획득!</div>
              {newTitleIds.map((id, index) => {
                const t = getTitleById(id);
                return t ? (
                  <motion.div
                    key={id}
                    className="bg-yellow-800/30 rounded-lg p-3 mb-2 border border-yellow-600/30"
                    initial={{ opacity: 0, x: 26 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: index * 0.06 }}
                  >
                    <div className="text-white font-bold text-lg">{t.name}</div>
                    <div className="text-yellow-200/70 text-sm">{t.description}</div>
                  </motion.div>
                ) : null;
              })}
              <motion.button
                onClick={() => {
                  SFX.buttonClick();
                  dismissNewTitles();
                }}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.92 }}
                className="mt-4 px-6 py-2 bg-yellow-600 text-white font-bold rounded-lg hover:bg-yellow-500 transition-colors"
              >
                확인
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
