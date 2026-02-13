'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, OwnedCard, BoosterPack, Deck, Card, Grade, MAX_LEVEL } from '@/types/game';
import { getCardById, ALL_CARDS } from '@/data/cards';
import { TITLES } from '@/data/titles';
import { generateId } from '@/lib/uuid';
import { openPack } from '@/lib/gacha';

const STORAGE_KEY = 'cardwars_save';

function createInitialState(): GameState {
  return {
    initialized: false,
    ownedCards: [],
    decks: [],
    activeDeckId: null,
    boosterPacks: [
      { id: generateId(), type: 'normal', opened: false },
      { id: generateId(), type: 'normal', opened: false },
      { id: generateId(), type: 'rare', opened: false },
    ],
    currency: 0,
    stats: { wins: 0, losses: 0, streak: 0, maxStreak: 0, scenariosCleared: 0 },
    earnedTitles: [],
    activeTitle: null,
  };
}

function loadState(): GameState {
  if (typeof window === 'undefined') return createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migration: add missing fields
      if (!parsed.earnedTitles) parsed.earnedTitles = [];
      if (!parsed.activeTitle) parsed.activeTitle = null;
      if (parsed.stats && parsed.stats.maxStreak === undefined) {
        parsed.stats.maxStreak = parsed.stats.streak || 0;
      }
      // Clean stale deck references
      if (parsed.decks && parsed.ownedCards) {
        const ownedIds = new Set((parsed.ownedCards as OwnedCard[]).map((c: OwnedCard) => c.instanceId));
        parsed.decks = (parsed.decks as Deck[]).map((d: Deck) => ({
          ...d,
          warriors: d.warriors.filter((w) => ownedIds.has(w.instanceId)),
          tactics: d.tactics.filter((t) => ownedIds.has(t)),
        }));
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return createInitialState();
}

function saveState(state: GameState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

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
      const existing = prev.decks.findIndex((d) => d.id === deck.id);
      const decks = [...prev.decks];
      if (existing >= 0) {
        decks[existing] = deck;
      } else {
        decks.push(deck);
      }
      return { ...prev, decks, activeDeckId: deck.id };
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
      if (!card) return prev;
      const cardData = getCardById(card.cardId);
      if (!cardData) return prev;
      const maxLvl = MAX_LEVEL[cardData.grade as Grade];
      if (card.level >= maxLvl) return prev;

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
    updateState((prev) => {
      const newStreak = win ? prev.stats.streak + 1 : 0;
      const newMaxStreak = Math.max(prev.stats.maxStreak, newStreak);
      return {
        ...prev,
        stats: {
          ...prev.stats,
          wins: prev.stats.wins + (win ? 1 : 0),
          losses: prev.stats.losses + (win ? 0 : 1),
          streak: newStreak,
          maxStreak: newMaxStreak,
        },
      };
    });
    // Award packs based on win/streak
    if (win) {
      addBoosterPack('normal');
      // Check streak-based rewards (use current state + 1 for new streak)
      const newStreak = state.stats.streak + 1;
      if (newStreak === 3) {
        addBoosterPack('rare');
      }
      if (newStreak === 5) {
        addBoosterPack('hero');
      }
    }
  }, [updateState, addBoosterPack, state.stats.streak]);

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
      const cardData = getCardById(c.cardId);
      if (!cardData) continue;
      const maxLvl = MAX_LEVEL[cardData.grade as Grade];
      if (c.level >= maxLvl) continue;
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
    resetGame,
    newTitleIds,
    dismissNewTitles,
    enhanceableCount,
  };
}
