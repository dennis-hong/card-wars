'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getTitleById } from '@/data/titles';
import { useGameStateContext } from '@/context/GameStateContext';
import { useRunContext } from '@/context/run-context';
import { SFX } from '@/lib/sound';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function Home() {
  const router = useRouter();
  const { state, loaded } = useGameStateContext();
  const { state: runState, loaded: runLoaded } = useRunContext();

  const activeTitleData = useMemo(
    () => (state.activeTitle ? getTitleById(state.activeTitle) : null),
    [state.activeTitle]
  );

  const canContinueRun = runLoaded && runState.phase !== 'idle' && runState.phase !== 'ended';
  const runSubtitle = useMemo(() => {
    if (!canContinueRun) return '';
    return `이어하기 Act ${runState.currentAct}`;
  }, [canContinueRun, runState.currentAct]);

  const navigate = (path: string) => {
    SFX.buttonClick();
    router.push(path);
  };

  if (!loaded || !runLoaded) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/images/title-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/75 via-black/55 to-black/85" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <section className="mb-8 w-full animate-[slideUp_260ms_ease] text-center">
          <div
            className="mb-4"
            style={{ filter: 'drop-shadow(0 0 20px rgba(255,170,0,0.5))' }}
          >
            <Image
              src="/images/logo.png"
              alt="Warlords Card Wars"
              width={112}
              height={112}
              className="mx-auto h-28 w-28 object-contain"
            />
          </div>
          <h1
            className="text-4xl font-black tracking-[0.2em] text-white"
            style={{ textShadow: '0 0 30px rgba(255,170,0,0.35)' }}
          >
            WARLORDS
          </h1>
          <div
            className="text-lg font-bold tracking-[0.28em] text-amber-400"
            style={{ textShadow: '0 0 20px rgba(251,191,36,0.4)' }}
          >
            CARD WARS
          </div>
          <div className="mt-1 text-sm text-gray-200">5분 컷 삼국지 카드 배틀</div>

          {activeTitleData && (
            <div className="mt-3">
              <span className="inline-block rounded-full border border-yellow-500/35 bg-black/35 px-3 py-1 text-xs font-bold text-yellow-200">
                👑 {activeTitleData.name}
              </span>
            </div>
          )}
        </section>

        <section className="mb-6 w-full rounded-2xl border border-white/15 bg-black/35 p-3 backdrop-blur-md">
          <div className="grid grid-cols-4 gap-2 text-center">
            <article className="rounded-xl bg-black/30 p-2">
              <p className="text-xl font-black text-green-400">{state.stats.wins}</p>
              <p className="text-[11px] text-gray-300">승리</p>
            </article>
            <article className="rounded-xl bg-black/30 p-2">
              <p className="text-xl font-black text-red-400">{state.stats.losses}</p>
              <p className="text-[11px] text-gray-300">패배</p>
            </article>
            <article className="rounded-xl bg-black/30 p-2">
              <p className="text-xl font-black text-yellow-400">{state.stats.streak}</p>
              <p className="text-[11px] text-gray-300">연승</p>
            </article>
            <article className="rounded-xl bg-black/30 p-2">
              <p className="text-xl font-black text-purple-400">{state.ownedCards.length}</p>
              <p className="text-[11px] text-gray-300">카드</p>
            </article>
          </div>
        </section>

        <section className="w-full space-y-3">
          <button
            onClick={() => navigate('/roguelike')}
            className="ui-btn ui-btn-danger w-full min-h-[64px] border border-red-500/30 animate-[titleGlowPulse_2s_ease-in-out_infinite]"
          >
            <div className="text-left">
              <div className="text-2xl font-black">🗺️ 탐험 시작</div>
              <div className="text-sm font-medium text-gray-100/90">
                {canContinueRun ? runSubtitle : '시작팩 개봉 후 덱 편성'}
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/roguelike?mode=practice')}
            className="ui-btn ui-btn-neutral w-full min-h-[52px] border border-white/10"
          >
            ⚔️ 연습 대전
          </button>

          <button
            onClick={() => navigate('/collection')}
            className="ui-btn ui-btn-neutral w-full min-h-[48px] border border-white/10"
          >
            🃏 카드 도감
          </button>

          <button
            onClick={() => navigate('/titles')}
            className="ui-btn ui-btn-neutral w-full min-h-[48px] border border-white/10"
          >
            🏆 칭호
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="ui-btn ui-btn-neutral w-full min-h-[48px] border border-white/10"
          >
            ⚙️ 설정
          </button>
        </section>

      </div>
    </main>
  );
}
