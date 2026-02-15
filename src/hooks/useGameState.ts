'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, OwnedCard, BoosterPack, Deck, Card, Grade, MAX_LEVEL } from '@/types/game';
import { getCardById, ALL_CARDS } from '@/data/cards';
import { TITLES } from '@/data/titles';
import { generateId } from '@/lib/uuid';
import { openPack } from '@/lib/gacha';
import { createInitialState, loadState, saveState } from '@/lib/storage';
import { canLevelUp, normalizeDeckComposition, validateDeck } from '@/lib/card-utils';

// Remove stale deck references when a card is removed from ownedCards
function cleanDecksAfterRemoval(decks: Deck[], removedInstanceId: string): Deck[] {
  return decks.map((deck) => ({
    ...deck,
    warriors: deck.warriors.filter((w) => w.instanceId !== removedInstanceId),
    tactics: deck.tactics.filter((t) => t !== removedInstanceId),
  }));
}

function getCollectionRate(ownedCards: OwnedCard[]): number {
  const uniqueIds = new Set(ownedCards.map((c) => c.cardId));
  return Math.round((uniqueIds.size / ALL_CARDS.length) * 100);
}

function checkNewTitles(state: GameState): string[] {
  const collectionRate = getCollectionRate(state.ownedCards);
  const newTitles: string[] = [];
  for (const title of TITLES) {
    if (!state.earnedTitles.includes(title.id) && title.condition(state.stats, collectionRate)) {
      newTitles.push(title.id);
    }
  }
  return newTitles;
}

export function useGameState() {
  const [state, setState] = useState<GameState>(() => loadState());
  const [loaded] = useState(true);
  const [newTitleIds, setNewTitleIds] = useState<string[]>([]);

  // Save on every change (after initial load)
  useEffect(() => {
    if (loaded) saveState(state);
  }, [state, loaded]);

  const dismissNewTitles = useCallback(() => {
    setNewTitleIds([]);
  }, []);

  const updateState = useCallback((updater: (prev: GameState) => GameState) => {
    setState((prev) => {
      const next = updater(prev);
      const newTitles = checkNewTitles(next);
      if (newTitles.length === 0) return next;

      queueMicrotask(() => {
        setNewTitleIds((current) => {
          const merged = [...current];
          for (const id of newTitles) {
            if (!merged.includes(id)) merged.push(id);
          }
          return merged;
        });
      });

      return {
        ...next,
        earnedTitles: [...next.earnedTitles, ...newTitles],
        activeTitle: next.activeTitle || newTitles[newTitles.length - 1],
      };
    });
  }, []);

  const setActiveTitle = useCallback((titleId: string | null) => {
    updateState((prev) => ({ ...prev, activeTitle: titleId }));
  }, [updateState]);

  // ─── Actions ───

  const addCards = useCallback((cards: Card[]): OwnedCard[] => {
    const newOwned: OwnedCard[] = cards.map((c) => ({
      instanceId: generateId(),
      cardId: c.id,
      level: 1,
      duplicates: 0,
    }));
    updateState((prev) => ({
      ...prev,
      initialized: true,
      ownedCards: [...prev.ownedCards, ...newOwned],
    }));
    return newOwned;
  }, [updateState]);

  const openBooster = useCallback((packId: string) => {
    const pack = state.boosterPacks.find((p) => p.id === packId);
    if (!pack || pack.opened) return null;
    const cards = openPack(pack.type);
    const newOwned: OwnedCard[] = cards.map((c) => ({
      instanceId: generateId(),
      cardId: c.id,
      level: 1,
      duplicates: 0,
    }));
    updateState((prev) => ({
      ...prev,
      initialized: true,
      ownedCards: [...prev.ownedCards, ...newOwned],
      boosterPacks: prev.boosterPacks.map((p) =>
        p.id === packId ? { ...p, opened: true } : p
      ),
    }));
    return cards;
  }, [state.boosterPacks, updateState]);

  const addBoosterPack = useCallback((type: BoosterPack['type']) => {
    updateState((prev) => ({
      ...prev,
      boosterPacks: [
        ...prev.boosterPacks,
        { id: generateId(), type, opened: false },
      ],
    }));
  }, [updateState]);

  const saveDeck = useCallback((deck: Deck) => {
    updateState((prev) => {
      const normalized = normalizeDeckComposition(deck, prev.ownedCards);
      const result = validateDeck(normalized, prev.ownedCards);
      if (!result.valid) return prev;

      const existing = prev.decks.findIndex((d) => d.id === normalized.id);
      const decks = [...prev.decks];
      if (existing >= 0) {
        decks[existing] = normalized;
      } else {
        decks.push(normalized);
      }
      return { ...prev, decks, activeDeckId: normalized.id };
    });
  }, [updateState]);

  const deleteDeck = useCallback((deckId: string) => {
    updateState((prev) => ({
      ...prev,
      decks: prev.decks.filter((d) => d.id !== deckId),
      activeDeckId: prev.activeDeckId === deckId ? null : prev.activeDeckId,
    }));
  }, [updateState]);

  const setActiveDeck = useCallback((deckId: string) => {
    updateState((prev) => ({ ...prev, activeDeckId: deckId }));
  }, [updateState]);

  // Auto-merge + enhance in one button press
  const enhanceCard = useCallback((instanceId: string): boolean => {
    let success = false;
    updateState((prev) => {
      const card = prev.ownedCards.find((c) => c.instanceId === instanceId);
      if (!card || !canLevelUp(card)) return prev;

      // If no duplicates stored, auto-merge from another owned copy
      if (card.duplicates < 1) {
        const donor = prev.ownedCards.find(
          (c) => c.cardId === card.cardId && c.instanceId !== instanceId
        );
        if (!donor) return prev; // no source to merge
        success = true;
        return {
          ...prev,
          ownedCards: prev.ownedCards
            .filter((c) => c.instanceId !== donor.instanceId)
            .map((c) =>
              c.instanceId === instanceId
                ? { ...c, level: c.level + 1 }
                : c
            ),
          decks: cleanDecksAfterRemoval(prev.decks, donor.instanceId),
        };
      }

      // Has stored duplicates, consume one
      success = true;
      return {
        ...prev,
        ownedCards: prev.ownedCards.map((c) =>
          c.instanceId === instanceId
            ? { ...c, level: c.level + 1, duplicates: c.duplicates - 1 }
            : c
        ),
      };
    });
    return success;
  }, [updateState]);

  const mergeCards = useCallback((targetId: string, sourceId: string) => {
    updateState((prev) => ({
      ...prev,
      ownedCards: prev.ownedCards
        .map((c) => {
          if (c.instanceId === targetId) {
            return { ...c, duplicates: c.duplicates + 1 };
          }
          return c;
        })
        .filter((c) => c.instanceId !== sourceId),
      decks: cleanDecksAfterRemoval(prev.decks, sourceId),
    }));
  }, [updateState]);

  const recordBattleResult = useCallback((win: boolean) => {
    let nextStreak = 0;

    updateState((prev) => {
      nextStreak = win ? prev.stats.streak + 1 : 0;
      const newMaxStreak = Math.max(prev.stats.maxStreak, nextStreak);
      return {
        ...prev,
        stats: {
          ...prev.stats,
          wins: prev.stats.wins + (win ? 1 : 0),
          losses: prev.stats.losses + (win ? 0 : 1),
          streak: nextStreak,
          maxStreak: newMaxStreak,
        },
      };
    });
    // Award packs based on win/streak
    if (win) {
      addBoosterPack('normal');
      if (nextStreak === 3) {
        addBoosterPack('rare');
      }
      if (nextStreak === 5) {
        addBoosterPack('hero');
      }
    }
  }, [addBoosterPack, updateState]);

  const recordScenarioClear = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        scenariosCleared: prev.stats.scenariosCleared + 1,
      },
    }));
  }, [updateState]);

  const resetGame = useCallback(() => {
    const fresh = createInitialState();
    setState(fresh);
    saveState(fresh);
  }, []);

  // Count cards that can be enhanced (have duplicates or extra copies)
  const enhanceableCount = useMemo(() => {
    const cardIdCounts: Record<string, number> = {};
    for (const c of state.ownedCards) {
      cardIdCounts[c.cardId] = (cardIdCounts[c.cardId] || 0) + 1;
    }
    let count = 0;
    const seen = new Set<string>();
    for (const c of state.ownedCards) {
      if (seen.has(c.cardId)) continue;
      seen.add(c.cardId);
      if (!canLevelUp(c)) continue;
      const totalDupes = c.duplicates + (cardIdCounts[c.cardId] - 1);
      if (totalDupes > 0) count++;
    }
    return count;
  }, [state.ownedCards]);

  return {
    state,
    loaded,
    addCards,
    openBooster,
    addBoosterPack,
    saveDeck,
    deleteDeck,
    setActiveDeck,
    setActiveTitle,
    enhanceCard,
    mergeCards,
    recordBattleResult,
    recordScenarioClear,
    resetGame,
    newTitleIds,
    dismissNewTitles,
    enhanceableCount,
  };
}
