'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { BoosterPack, GameState } from '@/types/game';

type GameStateHook = ReturnType<typeof useGameState>;
type CoreSlice = Pick<
  GameStateHook,
  'state' | 'loaded' | 'newTitleIds' | 'dismissNewTitles' | 'setActiveTitle' | 'enhanceableCount' | 'resetGame'
>;
type OwnedCardsSlice = Pick<
  GameStateHook,
  'addCards' | 'openBooster' | 'enhanceCard' | 'mergeCards'
> & { ownedCards: GameState['ownedCards']; ownedCardIds: Set<string> };
type DeckSlice = Pick<GameStateHook, 'saveDeck' | 'deleteDeck' | 'setActiveDeck'> & {
  decks: GameState['decks'];
  activeDeckId: GameState['activeDeckId'];
  decksCount: number;
};
type BattleSlice = Pick<GameStateHook, 'recordBattleResult'> & {
  addBoosterPack: (type: BoosterPack['type']) => void;
  recordScenarioClear: () => void;
};

const GameStateCoreContext = createContext<CoreSlice | null>(null);
const OwnedCardsContext = createContext<OwnedCardsSlice | null>(null);
const DeckContext = createContext<DeckSlice | null>(null);
const BattleProgressContext = createContext<BattleSlice | null>(null);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const game = useGameState();
  const {
    state,
    loaded,
    newTitleIds,
    dismissNewTitles,
    setActiveTitle,
    enhanceableCount,
    resetGame,
    addCards,
    openBooster,
    enhanceCard,
    mergeCards,
    saveDeck,
    deleteDeck,
    setActiveDeck,
    recordBattleResult,
    addBoosterPack,
    recordScenarioClear,
  } = game;

  const ownedCardIds = useMemo(
    () => new Set(state.ownedCards.map((ownedCard) => ownedCard.cardId)),
    [state.ownedCards],
  );

  const core = useMemo(
    () => ({
      state,
      loaded,
      newTitleIds,
      dismissNewTitles,
      setActiveTitle,
      enhanceableCount,
      resetGame,
    }),
    [state, loaded, newTitleIds, dismissNewTitles, setActiveTitle, enhanceableCount, resetGame],
  );

  const owned = useMemo(
    () => ({
      ownedCards: state.ownedCards,
      ownedCardIds,
      addCards,
      openBooster,
      enhanceCard,
      mergeCards,
    }),
    [state.ownedCards, ownedCardIds, addCards, openBooster, enhanceCard, mergeCards],
  );

  const decks = useMemo(
    () => ({
      decks: state.decks,
      decksCount: state.decks.length,
      activeDeckId: state.activeDeckId,
      saveDeck,
      deleteDeck,
      setActiveDeck,
    }),
    [state.decks, state.activeDeckId, saveDeck, deleteDeck, setActiveDeck],
  );

  const battle = useMemo(
    () => ({
      recordBattleResult,
      addBoosterPack,
      recordScenarioClear,
    }),
    [recordBattleResult, addBoosterPack, recordScenarioClear],
  );

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg animate-pulse">로딩 중...</div>
      </div>
    );
  }

  return (
    <GameStateCoreContext.Provider value={core}>
      <OwnedCardsContext.Provider value={owned}>
        <DeckContext.Provider value={decks}>
          <BattleProgressContext.Provider value={battle}>
            {children}
          </BattleProgressContext.Provider>
        </DeckContext.Provider>
      </OwnedCardsContext.Provider>
    </GameStateCoreContext.Provider>
  );
}

export function useGameStateCore() {
  const ctx = useContext(GameStateCoreContext);
  if (!ctx) {
    throw new Error('useGameStateCore must be used within GameStateProvider');
  }
  return ctx;
}

export function useOwnedCards() {
  const ctx = useContext(OwnedCardsContext);
  if (!ctx) {
    throw new Error('useOwnedCards must be used within GameStateProvider');
  }
  return ctx;
}

export function useDecks() {
  const ctx = useContext(DeckContext);
  if (!ctx) {
    throw new Error('useDecks must be used within GameStateProvider');
  }
  return ctx;
}

export function useBattleProgress() {
  const ctx = useContext(BattleProgressContext);
  if (!ctx) {
    throw new Error('useBattleProgress must be used within GameStateProvider');
  }
  return ctx;
}

export function useGameStateContext() {
  const core = useGameStateCore();
  const owned = useOwnedCards();
  const deck = useDecks();
  const battle = useBattleProgress();

  return useMemo(
    () => ({
      ...core,
      state: core.state,
      loaded: core.loaded,
      newTitleIds: core.newTitleIds,
      dismissNewTitles: core.dismissNewTitles,
      setActiveTitle: core.setActiveTitle,
      enhanceableCount: core.enhanceableCount,
      resetGame: core.resetGame,
      ownedCards: owned.ownedCards,
      openBooster: owned.openBooster,
      addCards: owned.addCards,
      enhanceCard: owned.enhanceCard,
      mergeCards: owned.mergeCards,
      decks: deck.decks,
      activeDeckId: deck.activeDeckId,
      decksCount: deck.decksCount,
      saveDeck: deck.saveDeck,
      deleteDeck: deck.deleteDeck,
      setActiveDeck: deck.setActiveDeck,
      recordBattleResult: battle.recordBattleResult,
      addBoosterPack: battle.addBoosterPack,
      recordScenarioClear: battle.recordScenarioClear,
    }),
    [core, deck, owned, battle],
  );
}
