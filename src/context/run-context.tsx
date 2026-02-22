'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CombatResult, Deck, MAX_LEVEL, OwnedCard } from '@/types/game';
import { getCardById } from '@/data/cards';
import { Card as GameCard } from '@/types/game';
import { useGameStateContext } from '@/context/GameStateContext';
import { loadRunState, saveRunState, clearRunState, createEmptyRunState } from '@/lib/roguelike/run-storage';
import { generateId } from '@/lib/uuid';
import { openPack } from '@/lib/gacha';
import {
  generateActMap,
  attachEncounterData,
  getNodeById,
  getReachableNodes,
} from '@/lib/roguelike/map-generator';
import { getEnemyTemplate, getGoldRewardRange } from '@/lib/roguelike/enemy-generator';
import { buildShopInventory } from '@/lib/roguelike/shop';
import { getChoiceById, getEventById } from '@/lib/roguelike/events';
import {
  MAX_RELIC_SLOTS,
  RunNodeType,
  RunRewardPayload,
  RunNodeId,
  RunAct,
  RunState,
  RunEventDefinition,
} from '@/lib/roguelike/run-types';
import { getRelicById, hasRelic as runHasRelic } from '@/lib/roguelike/relics';
import { usePathname, useRouter } from 'next/navigation';

type RunPhaseRoute = 'idle' | 'opening' | 'deck_build' | 'running' | 'reward' | 'event' | 'shop' | 'rest' | 'battle' | 'ended';

interface AddCardsResult {
  cards: OwnedCard[];
  count: number;
}

interface RunContextValue {
  state: RunState;
  loaded: boolean;
  canResume: boolean;
  startNewRun: () => void;
  clearRun: () => void;
  openStarterPack: (packId: string) => Card[] | null;
  ensureStarterComposition: () => void;
  saveDeck: (deck: Deck) => void;
  goToMap: () => void;
  completeBattle: (result: CombatResult) => void;
  chooseEvent: (choiceId: string) => void;
  selectNode: (nodeId: RunNodeId) => boolean;
  goHome: () => void;
  buyShopItem: (itemId: string, replaceRelicId?: string, removeInstanceId?: string) => boolean;
  healByRest: (amount?: number) => boolean;
  upgradeWarriorInRun: (instanceId: string) => boolean;
  grantRelic: (relicId: string, replaceRelicId?: string) => boolean;
  claimRewardCards: (cards: Card[]) => void;
  acknowledgeReward: (nextRoute?: string) => void;
  getCurrentNodeType: () => RunNodeType | null;
  getCurrentNodeReachable: () => Set<RunNodeId>;
  isReachableNode: (nodeId: RunNodeId) => boolean;
  getPhase: () => RunPhaseRoute;
  getNodeList: () => RunNodeId[];
}

const RunContext = createContext<RunContextValue | null>(null);

function isWarriorCard(card: Card | undefined): card is GameCard {
  return !!card && card.type === 'warrior';
}

function isTacticCard(card: Card | undefined): card is GameCard {
  return !!card && card.type === 'tactic';
}

function normalizeDeck(deck: Deck, ownedCards: OwnedCard[]): Deck {
  const hasOwned = new Set(ownedCards.map((item) => item.instanceId));
  const safeWarriors = deck.warriors.filter(
    (slot) => hasOwned.has(slot.instanceId),
  );
  const safeTactics = deck.tactics.filter((instanceId) => hasOwned.has(instanceId));
  return {
    id: deck.id || generateId(),
    name: deck.name || '원정대',
    warriors: safeWarriors.slice(0, 3),
    tactics: safeTactics.slice(0, 2),
  };
}

function countCardType(
  cards: OwnedCard[],
  predicate: (card: ReturnType<typeof getCardById>) => boolean,
) {
  let count = 0;
  for (const owned of cards) {
    const card = getCardById(owned.cardId);
    if (predicate(card)) count += 1;
  }
  return count;
}

function getDeckSummary(deck: Deck) {
  const lanes = deck.warriors.map((slot) => slot.lane);
  const uniqueLanes = new Set(lanes);
  return {
    ready: deck.warriors.length === 3 && uniqueLanes.size === 3 && deck.tactics.length >= 1,
    hasThreeWarriors: deck.warriors.length >= 3,
    hasTwoTactics: true, // 전법 없어도 진행 가능
  };
}

function getRoutePhaseFromRunState(state: RunState): RunPhaseRoute {
  return (state.phase as RunPhaseRoute) ?? 'idle';
}

export function RunContextProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const game = useGameStateContext();
  const {
    addCards: addCardsToGlobal,
    setActiveDeck,
    saveDeck: saveGameDeck,
    recordScenarioClear,
  } = game;

  const [state, setState] = useState<RunState>(() => {
    const loaded = loadRunState();
    return loaded ?? createEmptyRunState();
  });
  const [loaded] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ensureStarterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveRunState(state);
      saveTimerRef.current = null;
    }, 120);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [loaded, state]);

  useEffect(() => {
    return () => {
      if (ensureStarterTimerRef.current) {
        clearTimeout(ensureStarterTimerRef.current);
        ensureStarterTimerRef.current = null;
      }
    };
  }, []);

  const addRunCards = useCallback(
    (cards: Card[]): AddCardsResult => {
      if (cards.length === 0) {
        return { cards: [], count: 0 };
      }

      const added = addCardsToGlobal(cards);
      if (cards.length > 0) {
        setState((prev) => {
          const inventory: OwnedCard[] = [];
          const firstIndex = new Map<string, number>();

          for (const owned of prev.inventory) {
            const existingIdx = firstIndex.get(owned.cardId);
            if (existingIdx === undefined) {
              firstIndex.set(owned.cardId, inventory.length);
              inventory.push({ ...owned });
            } else {
              const existing = inventory[existingIdx];
              const extraCopies = Math.max(owned.level, owned.duplicates + 1);
              inventory[existingIdx] = {
                ...existing,
                level: existing.level + extraCopies,
                duplicates: existing.duplicates + extraCopies,
              };
            }
          }

          for (const card of cards) {
            const index = inventory.findIndex((owned) => owned.cardId === card.id);
            if (index >= 0) {
              const base = inventory[index];
              inventory[index] = {
                ...base,
                level: base.level + 1,
                duplicates: base.duplicates + 1,
              };
            } else {
              inventory.push({
                instanceId: generateId(),
                cardId: card.id,
                level: 1,
                duplicates: 0,
              });
            }
          }

          return {
            ...prev,
            inventory,
            stats: {
              ...prev.stats,
              cardsObtained: prev.stats.cardsObtained + cards.length,
            },
          };
        });
      }

      return { cards: added, count: cards.length };
    },
    [addCardsToGlobal]
  );

  const startNewRun = useCallback(() => {
    const now = Date.now();
    const map = attachEncounterData(generateActMap(1));
    const runId = generateId();
    setState({
      ...createEmptyRunState(),
      stateVersion: 1,
      runId,
      startedAt: now,
      updatedAt: now,
      currentAct: 1,
      phase: 'opening',
      openedStarterPacks: [
        { id: `${runId}-starter-1`, type: 'normal', opened: false },
        { id: `${runId}-starter-2`, type: 'normal', opened: false },
        { id: `${runId}-starter-3`, type: 'normal', opened: false },
      ],
      map,
      deck: { id: runId, name: '원정대', warriors: [], tactics: [] },
      relics: [],
      inventory: [],
      currentNodeId: map.startNodeId,
      visitedNodes: [],
    });
    router.replace('/roguelike');
  }, [router]);

  const clearRun = useCallback(() => {
    clearRunState();
    setState(createEmptyRunState());
  }, []);

  const ensureStarterComposition = useCallback(() => {
    const warriors = countCardType(state.inventory, isWarriorCard);
    const tactics = countCardType(state.inventory, isTacticCard);
    let missingWarrior = Math.max(0, 3 - warriors);
    let missingTactic = Math.max(0, 2 - tactics);

    if (missingWarrior === 0 && missingTactic === 0) return;

    const bonusCards: Card[] = [];
    let guard = 30;

    while ((missingWarrior > 0 || missingTactic > 0) && guard > 0) {
      const reroll = openPack('normal');
      for (const card of reroll) {
        if (isWarriorCard(card) && missingWarrior > 0) {
          bonusCards.push(card);
          missingWarrior -= 1;
        } else if (isTacticCard(card) && missingTactic > 0) {
          bonusCards.push(card);
          missingTactic -= 1;
        }
      }
      guard -= 1;
    }

    if (bonusCards.length > 0) {
      addRunCards(bonusCards);
    }
  }, [state.inventory, addRunCards]);

  // (legacy block removed)

  const openStarterPack = useCallback(
    (packId: string) => {
      let cards: Card[] | null = null;
      let shouldEnsureStarter = false;
      setState((prev) => {
        if (prev.phase !== 'opening' && prev.phase !== 'deck_build') return prev;
        const pack = prev.openedStarterPacks.find((item) => item.id === packId);
        if (!pack || pack.opened) return prev;

        cards = openPack('normal');
        const packs = prev.openedStarterPacks.map((item) =>
          item.id === packId ? { ...item, opened: true } : item
        );
        const nextPhase = packs.every((item) => item.opened) ? 'deck_build' : 'opening';
        shouldEnsureStarter = packs.every((item) => item.opened);
        return {
          ...prev,
          openedStarterPacks: packs,
          phase: nextPhase,
          pendingReward: null,
        };
      });

      if (!cards) return null;
      addRunCards(cards);

      if (shouldEnsureStarter) {
        if (ensureStarterTimerRef.current) {
          clearTimeout(ensureStarterTimerRef.current);
        }
        ensureStarterTimerRef.current = setTimeout(() => {
          ensureStarterComposition();
          ensureStarterTimerRef.current = null;
        }, 100);
      }

      return cards;
    },
    [addRunCards, ensureStarterComposition]
  );

  const saveDeck = useCallback((deck: Deck) => {
    setState((prev) => {
      const normalized = normalizeDeck(deck, prev.inventory);
      return {
        ...prev,
        deck: normalized,
        phase: prev.phase === 'deck_build' ? 'running' : prev.phase,
      };
    });

    saveGameDeck(deck);
    setActiveDeck(deck.id);
  }, [saveGameDeck, setActiveDeck]);

  const goToMap = useCallback(() => {
    setState((prev) => {
      const canEnter = getDeckSummary(prev.deck).ready;
      if (!canEnter) {
        return { ...prev, phase: 'deck_build' };
      }
      if (!prev.map) {
        const nextMap = attachEncounterData(generateActMap(prev.currentAct || 1));
        return {
          ...prev,
          phase: 'running',
          map: nextMap,
          currentNodeId: nextMap.startNodeId,
          visitedNodes: [nextMap.startNodeId],
        };
      }

      if (!prev.currentNodeId) {
        return {
          ...prev,
          phase: 'running',
          currentNodeId: prev.map.startNodeId,
          visitedNodes: [prev.map.startNodeId],
        };
      }

      return {
        ...prev,
        phase: 'running',
      };
    });
    router.push('/roguelike/map');
  }, [router]);

  const getCurrentNodeType = useCallback((): RunNodeType | null => {
    if (!state.map || !state.currentNodeId) return null;
    const node = getNodeById(state.map, state.currentNodeId);
    return node ? node.type : null;
  }, [state.currentNodeId, state.map]);

  const getCurrentNodeReachable = useCallback((): Set<RunNodeId> => {
    if (!state.currentNodeId) return new Set();
    return getReachableNodes(state.map, state.currentNodeId);
  }, [state.currentNodeId, state.map]);

  const isReachableNode = useCallback(
    (nodeId: RunNodeId) => {
      const reachable = getCurrentNodeReachable();
      return reachable.has(nodeId);
    },
    [getCurrentNodeReachable]
  );

  const getNodeList = useCallback(() => {
    if (!state.map) return [];
    return state.map.nodes.map((node) => node.id);
  }, [state.map]);

  const selectNode = useCallback((nodeId: RunNodeId) => {
    if (!state.map || !state.currentNodeId || !isReachableNode(nodeId)) return false;
    const node = getNodeById(state.map, nodeId);
    if (!node) return false;

    const prevVisited = state.visitedNodes;
    const nextVisited = new Set(prevVisited);
    const wasVisited = nextVisited.has(nodeId);
    nextVisited.add(nodeId);

    setState((prev) => {
      const previous = getNodeById(prev.map as NonNullable<typeof prev.map>, nodeId);
      if (!previous) return prev;
      const nextVisitedNodes = Array.from(new Set(prev.visitedNodes).add(nodeId));
      const nextStats = {
        ...prev.stats,
        floorsCleared: prev.stats.floorsCleared + (wasVisited ? 0 : 1),
      };

      if (previous.type === 'event') {
        return {
          ...prev,
          currentNodeId: nodeId,
          visitedNodes: nextVisitedNodes,
          stats: nextStats,
          phase: 'event',
          pendingEventId: previous.eventId ?? null,
        };
      }
      if (previous.type === 'shop') {
        return {
          ...prev,
          currentNodeId: nodeId,
          visitedNodes: nextVisitedNodes,
          stats: nextStats,
          phase: 'shop',
          pendingShopItems: buildShopInventory().map((item) => ({ ...item })),
        };
      }
      if (previous.type === 'rest') {
        return {
          ...prev,
          currentNodeId: nodeId,
          visitedNodes: nextVisitedNodes,
          stats: nextStats,
          phase: 'rest',
        };
      }
      return {
        ...prev,
        currentNodeId: nodeId,
        visitedNodes: nextVisitedNodes,
        stats: nextStats,
        phase: 'battle',
      };
    });
    return true;
  }, [isReachableNode, state.map, state.currentNodeId, state.visitedNodes]);

  const grantRelic = useCallback((relicId: string, replaceRelicId?: string): boolean => {
    if (!getRelicById(relicId)) return false;
    let success = false;
    setState((prev) => {
      if (runHasRelic(prev.relics, relicId)) {
        success = false;
        return prev;
      }
      if (prev.relics.length < MAX_RELIC_SLOTS) {
        success = true;
        return {
          ...prev,
          relics: [...prev.relics, relicId],
          stats: {
            ...prev.stats,
            relicsCollected: prev.stats.relicsCollected + 1,
          },
        };
      }
      if (!replaceRelicId) {
        success = false;
        return prev;
      }
      const index = prev.relics.indexOf(replaceRelicId);
      if (index < 0) {
        success = false;
        return prev;
      }
      const nextRelics = [...prev.relics];
      nextRelics[index] = relicId;
      success = true;
      return {
        ...prev,
        relics: nextRelics,
        stats: {
          ...prev.stats,
          relicsCollected: prev.stats.relicsCollected + 1,
        },
      };
    });
    return success;
  }, []);

  const completeBattle = useCallback((result: CombatResult) => {
    if (!state.currentNodeId || !state.map || !state.currentAct) return;
    const node = getNodeById(state.map, state.currentNodeId);
    if (!node || (node.type !== 'battle' && node.type !== 'elite' && node.type !== 'boss')) return;

    const enemy = node.enemy ?? getEnemyTemplate(state.currentAct, node.type);
    const goldRange = getGoldRewardRange(state.currentAct, node.type);
    const rewardGold = goldRange
      ? Math.floor(Math.random() * (goldRange.max - goldRange.min + 1)) + goldRange.min
      : 0;

    if (result !== 'win') {
      recordScenarioClear();
      setState((prev) => ({
        ...prev,
        phase: 'ended',
        result: 'loss',
        stats: {
          ...prev.stats,
          battlesFought: prev.stats.battlesFought + 1,
          lastBattleResult: result,
          goldEarned: prev.stats.goldEarned + rewardGold,
        },
      }));
      return;
    }

    setState((prev) => {
      const nextReward: RunRewardPayload = {
        sourceNodeId: node.id,
        sourceType: node.type,
        packType: enemy.packReward,
        gold: rewardGold,
        relicOptions: node.type === 'elite' || node.type === 'boss' ? enemy.relicChoices || [] : [],
      };
      const base: RunState = {
        ...prev,
        stats: {
          ...prev.stats,
          battlesWon: prev.stats.battlesWon + 1,
          battlesFought: prev.stats.battlesFought + 1,
          elitesCleared: prev.stats.elitesCleared + (node.type === 'elite' ? 1 : 0),
          goldEarned: prev.stats.goldEarned + rewardGold,
          lastBattleResult: 'win',
        },
        gold: prev.gold + rewardGold,
        pendingReward: nextReward,
        phase: 'reward',
        result: null,
      };

      if (node.type === 'boss' && prev.currentAct < 3) {
        const nextAct = (Math.max(1, prev.currentAct) + 1) as RunAct;
        const nextMap = attachEncounterData(generateActMap(nextAct));
        return {
          ...base,
          currentAct: nextAct,
          map: nextMap,
          currentNodeId: nextMap.startNodeId,
          visitedNodes: [nextMap.startNodeId],
          result: null,
        };
      }

      if (node.type === 'boss' && prev.currentAct === 3) {
        recordScenarioClear();
        return {
          ...base,
          result: 'win',
        };
      }

      return base;
    });
  }, [recordScenarioClear, state.currentAct, state.currentNodeId, state.map]);

  const chooseEvent = useCallback((choiceId: string) => {
    const rewardCards: Card[] = [];
    setState((prev) => {
      if (!prev.pendingEventId || prev.phase !== 'event') return prev;
      const event = getEventById(prev.pendingEventId) as RunEventDefinition | null;
      if (!event) return prev;
      const choice = getChoiceById(event, choiceId);
      if (!choice) return prev;
      const nextState = { ...prev };
      let relicGranted = false;

      for (const effect of choice.effects) {
        if (effect.type === 'gold') {
          nextState.gold = Math.max(0, nextState.gold + (effect.value || 0));
        } else if (effect.type === 'card' && effect.cardId) {
          const card = getCardById(effect.cardId);
          if (card) {
            rewardCards.push(card);
          }
        } else if (effect.type === 'hp') {
          // 팀 HP 개념은 루트 난이도 규칙에서 제거되어 HP 이벤트는 미반영합니다.
        } else if (effect.type === 'relic' && effect.relicId) {
          const relicId = effect.relicId;
          if (runHasRelic(nextState.relics, relicId)) continue;
          if (nextState.relics.length >= MAX_RELIC_SLOTS) continue;
          nextState.relics = [...nextState.relics, relicId];
          relicGranted = true;
        } else if (effect.type === 'removeCard') {
          const removeCount = Math.max(1, effect.value || 1);
          for (let i = 0; i < removeCount; i++) {
            const removable = nextState.inventory.find((owned) => owned.cardId !== 'w-lu-bu');
            if (!removable) break;
            nextState.inventory = nextState.inventory.filter((owned) => owned.instanceId !== removable.instanceId);
            nextState.deck = normalizeDeck({
              ...nextState.deck,
              warriors: nextState.deck.warriors.filter((slot) => slot.instanceId !== removable.instanceId),
              tactics: nextState.deck.tactics.filter((slot) => slot !== removable.instanceId),
            }, nextState.inventory);
          }
        }
      }
      nextState.pendingEventId = null;
      if (relicGranted) {
        nextState.stats = {
          ...nextState.stats,
          relicsCollected: nextState.stats.relicsCollected + 1,
        };
      }
      nextState.phase = 'running';
      return nextState;
    });
    rewardCards.forEach((card) => addRunCards([card]));
  }, [addRunCards]);

  const acknowledgeReward = useCallback((nextRouteOverride?: string) => {
    let nextRoute = nextRouteOverride || '/roguelike/map';
    setState((prev) => {
      const next = { ...prev, pendingReward: null };
      if (prev.result === 'loss') return { ...next, phase: 'ended' };
      if (prev.phase !== 'reward') return prev;
      if (prev.result === 'win' && prev.currentAct === 3) {
        nextRoute = '/roguelike/summary';
        return { ...next, phase: 'ended' };
      }
      return { ...next, phase: 'running' };
    });
    router.replace(nextRoute);
  }, [router]);

  const buyShopItem = useCallback(
    (itemId: string, replaceRelicId?: string, removeInstanceId?: string) => {
      let success = false;
      let rewardCard: Card | null = null;
      setState((prev) => {
        if (prev.phase !== 'shop') return prev;
        const item = prev.pendingShopItems.find((entry) => entry.id === itemId);
        if (!item || prev.gold < item.price) return prev;

        const nextItems = prev.pendingShopItems.filter((entry) => entry.id !== itemId);
        const next = { ...prev, gold: prev.gold - item.price, pendingShopItems: nextItems };

        if (item.type === 'relic' && item.relicId) {
          if (prev.relics.includes(item.relicId)) return prev;
          if (next.relics.length >= MAX_RELIC_SLOTS) {
            if (!replaceRelicId) return prev;
            const index = next.relics.indexOf(replaceRelicId);
            if (index < 0) return prev;
            const relics = [...next.relics];
            relics[index] = item.relicId;
            next.relics = relics;
            success = true;
          } else {
            next.relics = [...next.relics, item.relicId];
            success = true;
          }
          next.stats = {
            ...next.stats,
            relicsCollected: next.stats.relicsCollected + 1,
          };
          return { ...next };
        }

        if (item.type === 'restore') {
          // 팀 HP 회복 효과는 탐험 내 전멸 패배 규칙 전환으로 비활성화합니다.
          success = true;
          return next;
        }

        if (item.type === 'remove') {
          const target = removeInstanceId || next.inventory[0]?.instanceId;
          if (!target) return prev;
          next.inventory = next.inventory.filter((owned) => owned.instanceId !== target);
          next.deck = {
            ...next.deck,
            warriors: next.deck.warriors.filter((slot) => slot.instanceId !== target),
            tactics: next.deck.tactics.filter((slot) => slot !== target),
          };
          success = true;
          return next;
        }

        if (item.type === 'card') {
          const cardId = item.cardId;
          if (!cardId) return prev;
          const card = getCardById(cardId);
          if (!card) return prev;
          success = true;
          rewardCard = card;
          return next;
        }

        return prev;
      });
      if (rewardCard) {
        addRunCards([rewardCard]);
      }
      return success;
    },
    [addRunCards]
  );

  const healByRest = useCallback(() => {
    let success = false;
    setState((prev) => {
      if (prev.phase !== 'rest') return prev;
      success = true;
      return { ...prev, phase: 'running' };
    });
    return success;
  }, []);

  const upgradeWarriorInRun = useCallback((instanceId: string) => {
    let success = false;
    setState((prev) => {
      const owned = prev.inventory.find((card) => card.instanceId === instanceId);
      if (!owned) return prev;
      const cardData = getCardById(owned.cardId);
      if (!cardData || cardData.type !== 'warrior') return prev;
      const max = MAX_LEVEL[cardData.grade];
      if (owned.level >= max) return prev;
      success = true;
      return {
        ...prev,
        inventory: prev.inventory.map((entry) => (entry.instanceId === instanceId ? { ...entry, level: entry.level + 1 } : entry)),
        deck: normalizeDeck(
          prev.deck,
          prev.inventory.map((entry) => (entry.instanceId === instanceId ? { ...entry, level: entry.level + 1 } : entry))
        ),
      };
    });
    return success;
  }, []);

  const claimRewardCards = useCallback((cards: Card[]) => {
    addRunCards(cards);
  }, [addRunCards]);

  const getPhase = useCallback(() => {
    return getRoutePhaseFromRunState(state);
  }, [state]);

  const goHome = useCallback(() => {
    if (pathname?.startsWith('/roguelike')) {
      router.replace('/');
    }
  }, [pathname, router]);

  const contextValue = useMemo<RunContextValue>(
    () => ({
      state,
      loaded,
      canResume: state.phase !== 'idle' && state.phase !== 'ended' && state.phase !== 'running',
      startNewRun,
      clearRun,
      openStarterPack,
      ensureStarterComposition,
      saveDeck,
      goToMap,
      completeBattle,
      chooseEvent,
      selectNode,
      goHome,
      buyShopItem,
      healByRest,
      upgradeWarriorInRun,
      grantRelic,
      claimRewardCards,
      acknowledgeReward,
      getCurrentNodeType,
      getCurrentNodeReachable,
      isReachableNode,
      getPhase,
      getNodeList,
    }),
    [
      state,
      loaded,
      startNewRun,
      clearRun,
      openStarterPack,
      ensureStarterComposition,
      saveDeck,
      goToMap,
      completeBattle,
      chooseEvent,
      selectNode,
      goHome,
      buyShopItem,
      healByRest,
      upgradeWarriorInRun,
      grantRelic,
      claimRewardCards,
      acknowledgeReward,
      getCurrentNodeType,
      getCurrentNodeReachable,
      isReachableNode,
      getPhase,
      getNodeList,
    ],
  );

  return <RunContext.Provider value={contextValue}>{children}</RunContext.Provider>;
}

export function useRunContext() {
  const ctx = useContext(RunContext);
  if (!ctx) {
    throw new Error('useRunContext must be used inside RunContextProvider');
  }
  return ctx;
}
