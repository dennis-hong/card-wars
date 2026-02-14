'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getWarriorById } from '@/data/cards';
import { useGameStateContext } from '@/context/GameStateContext';
import BattleArena from '@/components/battle/BattleArena';
import { Deck } from '@/types/game';

export default function BattlePage() {
  const router = useRouter();
  const {
    state,
    recordBattleResult,
    loaded,
  } = useGameStateContext();
  const [streakReward, setStreakReward] = useState<{ type: string; streak: number } | null>(null);

  const activeDeck = useMemo(
    () => state.decks.find((d) => d.id === state.activeDeckId) || null,
    [state.decks, state.activeDeckId]
  );

  const validWarriorCount = useMemo(() => {
    if (!activeDeck) return 0;
    return activeDeck.warriors.filter((w) => {
      const owned = state.ownedCards.find((c) => c.instanceId === w.instanceId);
      return owned && getWarriorById(owned.cardId);
    }).length;
  }, [activeDeck, state.ownedCards]);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg animate-pulse">로딩 중...</div>
      </div>
    );
  }

  if (!activeDeck || validWarriorCount < 3) {
    return (
      <div className="min-h-screen ui-page flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⚔️</div>
          <div className="text-white mb-2">
            {!activeDeck ? '활성 덱이 없습니다!' : '덱의 무장이 부족합니다!'}
          </div>
          <div className="text-gray-300 text-sm mb-4">
            {!activeDeck
              ? '먼저 덱을 만들고 활성화하세요.'
              : '카드 강화/합성으로 덱에서 무장이 빠졌을 수 있습니다. 덱을 다시 편집해주세요.'}
          </div>
          <button
            onClick={() => router.push('/deck')}
            className="ui-btn px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
          >
            덱 관리로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <BattleArena
        deck={activeDeck as Deck}
        ownedCards={state.ownedCards}
        wins={state.stats.wins}
        onBattleEnd={(result) => {
          let reward: { type: string; streak: number } | null = null;
          if (result === 'win') {
            const newStreak = state.stats.streak + 1;
            if (newStreak === 3) reward = { type: 'rare', streak: 3 };
            if (newStreak === 5) reward = { type: 'hero', streak: 5 };
          }
          setStreakReward(reward);
          recordBattleResult(result === 'win');
          if (!reward) {
            router.push('/');
          }
        }}
        onExit={() => router.push('/')}
        streakReward={streakReward}
      />

      {streakReward && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
          <div
            className="bg-gradient-to-b from-purple-900/90 to-gray-900/95 rounded-2xl p-6 max-w-xs w-full text-center border-2 border-purple-500/50 shadow-2xl"
            style={{ animation: 'streakBounce 0.6s ease-out' }}
          >
            <style jsx>{`
              @keyframes streakBounce {
                0% { transform: translateY(100px); opacity: 0; }
                40% { transform: translateY(-10px); opacity: 1; }
                60% { transform: translateY(5px); }
                100% { transform: translateY(0); opacity: 1; }
              }
            `}</style>
            <div className="text-4xl mb-3">🔥</div>
            <div className="text-xl font-black text-purple-300 mb-2">
              {streakReward.streak}연승 달성!
            </div>
            <div className="text-sm text-purple-200/70 mb-4">
              보상: {streakReward.type === 'hero' ? '🟣 영웅팩' : '🔵 희귀팩'} 1개
            </div>
            <button
              onClick={() => {
                setStreakReward(null);
                router.push('/');
              }}
              className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
