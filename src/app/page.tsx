'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getTitleById, TITLES } from '@/data/titles';
import { useGameStateContext } from '@/context/GameStateContext';
import { SFX } from '@/lib/sound';

export default function Home() {
  const router = useRouter();
  const {
    state,
    loaded,
    resetGame,
    enhanceableCount,
  } = useGameStateContext();

  const unopenedPacks = useMemo(
    () => state.boosterPacks.filter((p) => !p.opened),
    [state.boosterPacks]
  );

  const activeTitleData = useMemo(
    () => state.activeTitle ? getTitleById(state.activeTitle) : null,
    [state.activeTitle]
  );

  const navigate = (path: string) => {
    SFX.buttonClick();
    router.push(path);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg animate-pulse">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/images/title-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

      <div className="flex-1 flex flex-col items-center justify-start sm:justify-center px-4 pt-8 pb-8 sm:p-8 relative z-10">
        <div className="text-center mb-8 sm:mb-12">
          <div className="mb-4" style={{ filter: 'drop-shadow(0 0 20px rgba(255,170,0,0.5)' }}>
            <Image src="/images/logo.png" alt="Warlords Card Wars" width={112} height={112} className="w-28 h-28 mx-auto object-contain" />
          </div>
          <h1
            className="text-4xl sm:text-5xl font-black text-white tracking-[0.18em] sm:tracking-widest mb-2"
            style={{ textShadow: '0 0 40px rgba(255,170,0,0.4), 0 4px 8px rgba(0,0,0,0.8)' }}
          >
            WARLORDS
          </h1>
          <div
            className="text-lg sm:text-xl font-bold text-amber-400 tracking-[0.28em] sm:tracking-[0.3em]"
            style={{ textShadow: '0 0 20px rgba(251,191,36,0.4)' }}
          >
            CARD WARS
          </div>
          <div className="text-sm text-gray-200 mt-2 tracking-wider">5분 컷 삼국지 카드 배틀</div>

          {activeTitleData && (
            <button
              onClick={() => navigate('/titles')}
              className="mt-3 inline-block"
            >
              <span className="text-xs bg-gradient-to-r from-yellow-700 to-amber-600 text-yellow-200 px-3 py-1 rounded-full font-bold border border-yellow-500/30 hover:border-yellow-400/50 transition-colors">
                👑 {activeTitleData.name}
              </span>
            </button>
          )}
        </div>

        <div className="flex gap-5 sm:gap-6 mb-6 sm:mb-8 text-center bg-black/35 backdrop-blur-sm rounded-2xl px-5 sm:px-6 py-3 border border-white/15">
          <div>
            <div className="text-xl font-bold text-green-400">{state.stats.wins}</div>
            <div className="text-xs text-gray-300">승리</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-400">{state.stats.losses}</div>
            <div className="text-xs text-gray-300">패배</div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-400">{state.stats.streak}</div>
            <div className="text-xs text-gray-300">연승</div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-400">{state.ownedCards.length}</div>
            <div className="text-xs text-gray-300">카드</div>
          </div>
        </div>

        {state.stats.streak > 0 && (
          <div className="w-full max-w-xs mb-6">
            <div className="flex justify-between text-[10px] text-gray-300 mb-1">
              <span>🔥 {state.stats.streak}연승</span>
              <span>다음 보상: {state.stats.streak < 3 ? '3연승 (희귀팩)' : state.stats.streak < 5 ? '5연승 (영웅팩)' : '달성 완료!'}</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
                style={{ width: `${Math.min(100, (state.stats.streak / 5) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="w-full max-w-xs space-y-3">
          {unopenedPacks.length > 0 && (
            <button
              onClick={() => navigate('/booster')}
              className="ui-btn w-full py-4 min-h-14 bg-gradient-to-r from-amber-600 to-yellow-500 text-white font-bold rounded-xl hover:from-amber-500 hover:to-yellow-400 transition-all relative overflow-hidden"
              style={{ animation: 'glow 2s infinite' }}
            >
              <span className="relative z-10">
                🎁 부스터팩 개봉 ({unopenedPacks.length}개)
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ animation: 'shimmer 2s infinite' }} />
            </button>
          )}

          <button
            onClick={() => navigate('/roguelike')}
            className="ui-btn ui-btn-danger w-full py-4 min-h-14 text-lg border border-red-500/30"
          >
            🗺️ 탐험 시작
          </button>

          <button
            onClick={() => navigate('/battle')}
            className="ui-btn ui-btn-neutral w-full py-3 min-h-12 border border-white/10"
          >
            ⚔️ 연습 대전
          </button>

          <button
            onClick={() => navigate('/deck')}
            className="ui-btn ui-btn-neutral w-full py-3 min-h-12"
          >
            🃏 덱 관리
          </button>

          <button
            onClick={() => navigate('/collection')}
            className="ui-btn ui-btn-neutral w-full py-3 min-h-12 relative"
          >
            📚 카드 수집
            {enhanceableCount > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 text-black text-xs font-black rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-yellow-500/50">
                {enhanceableCount}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/titles')}
            className="ui-btn ui-btn-neutral w-full py-3 min-h-12"
          >
            🏆 칭호 ({state.earnedTitles.length}/{TITLES.length})
          </button>

          {unopenedPacks.length === 0 && (
            <button
              onClick={() => navigate('/booster')}
              className="ui-btn w-full py-3 min-h-12 bg-white/10 backdrop-blur-sm text-gray-300 font-bold rounded-xl hover:bg-white/20 transition-all border border-white/10"
            >
              📦 부스터팩
            </button>
          )}
        </div>
      </div>

      <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-center relative z-10">
        <button
          onClick={() => {
            if (confirm('정말 게임을 초기화하시겠습니까? 모든 데이터가 삭제됩니다!')) {
              resetGame();
            }
          }}
          className="text-xs text-gray-400 hover:text-gray-200"
        >
          게임 초기화
        </button>
      </div>
    </div>
  );
}
