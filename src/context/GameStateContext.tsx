'use client';

import { createContext, useContext, ReactNode, useSyncExternalStore } from 'react';
import { useGameState } from '@/hooks/useGameState';

type GameStateContextType = ReturnType<typeof useGameState>;

const GameStateContext = createContext<GameStateContextType | null>(null);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const state = useGameState();

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg animate-pulse">로딩 중...</div>
      </div>
    );
  }

  return (
    <GameStateContext.Provider value={state}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameStateContext() {
  const state = useContext(GameStateContext);
  if (!state) {
    throw new Error('useGameStateContext must be used within GameStateProvider');
  }
  return state;
}
