'use client';

import { useMemo } from 'react';
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

      {hasNewTitles && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-yellow-900/90 to-gray-900/95 rounded-2xl p-6 max-w-xs w-full text-center border-2 border-yellow-500/50 shadow-2xl shadow-yellow-500/20">
            <div className="text-4xl mb-3">🏆</div>
            <div className="text-xl font-black text-yellow-300 mb-4">칭호 획득!</div>
            {newTitleIds.map((id) => {
              const t = getTitleById(id);
              return t ? (
                <div key={id} className="bg-yellow-800/30 rounded-lg p-3 mb-2 border border-yellow-600/30">
                  <div className="text-white font-bold text-lg">{t.name}</div>
                  <div className="text-yellow-200/70 text-sm">{t.description}</div>
                </div>
              ) : null;
            })}
            <button
              onClick={() => {
                SFX.buttonClick();
                dismissNewTitles();
              }}
              className="mt-4 px-6 py-2 bg-yellow-600 text-white font-bold rounded-lg hover:bg-yellow-500 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
