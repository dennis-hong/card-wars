'use client';

import { useRouter } from 'next/navigation';
import { TITLES } from '@/data/titles';
import { useGameStateContext } from '@/context/GameStateContext';
import { SFX } from '@/lib/sound';

export default function TitlesPage() {
  const router = useRouter();
  const { state, setActiveTitle } = useGameStateContext();

  return (
    <div className="min-h-screen ui-page p-4 md:p-6 pb-[calc(6rem+env(safe-area-inset-bottom))] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/')}
          className="text-gray-300 text-sm hover:text-white min-h-10 px-2"
        >
          ← 뒤로
        </button>
        <h1 className="text-white font-bold text-lg">칭호 목록</h1>
        <div className="w-12" />
      </div>

      <div className="space-y-3">
        {TITLES.map((title) => {
          const earned = state.earnedTitles.includes(title.id);
          const isActive = state.activeTitle === title.id;
          return (
            <div
              key={title.id}
              className={`rounded-xl p-4 border transition-all ${
                earned
                  ? isActive
                    ? 'bg-yellow-900/30 border-yellow-500/50'
                    : 'bg-gray-800/50 border-gray-600/50'
                  : 'bg-gray-800/40 border-gray-700/40 opacity-85'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${earned ? 'text-white' : 'text-gray-300'}`}>
                      {title.name}
                    </span>
                    {isActive && (
                      <span className="text-[10px] bg-yellow-600 text-white px-1.5 py-0.5 rounded-full">착용 중</span>
                    )}
                  </div>
                  <div className={`text-xs mt-0.5 ${earned ? 'text-gray-300' : 'text-gray-400'}`}>{title.description}</div>
                  <div className={`text-[10px] mt-0.5 ${earned ? 'text-gray-400' : 'text-gray-500'}`}>
                    {title.category === 'wins' ? '🏆 승리' : title.category === 'collection' ? '📚 수집' : '🔥 연승'}
                  </div>
                </div>
                {earned && !isActive && (
                  <button
                    onClick={() => {
                      SFX.buttonClick();
                      setActiveTitle(title.id);
                    }}
                    className="ui-btn px-3 py-1 bg-yellow-700 text-white text-xs rounded hover:bg-yellow-600"
                  >
                    착용
                  </button>
                )}
                {earned && isActive && (
                  <button
                    onClick={() => {
                      SFX.buttonClick();
                      setActiveTitle(null);
                    }}
                    className="ui-btn px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600"
                  >
                    해제
                  </button>
                )}
                {!earned && (
                  <span className="text-xs text-gray-400">🔒 미달성</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
