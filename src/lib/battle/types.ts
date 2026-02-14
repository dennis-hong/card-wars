import { BattleAction, BattleState, BattleWarrior, Deck, OwnedCard, StatusEffect } from '@/types/game';

export type BattleRandom = {
  next: () => number;
};

export type CombatMathFn = (value: number) => number;

export interface BattleEngineOptions {
  random?: BattleRandom;
}

export interface BattleTurnResult {
  state: BattleState;
  actions: BattleAction[];
}

export interface BattleActionContext {
  battle: BattleState;
  random: BattleRandom;
}

export interface BattleCombatState {
  state: BattleState;
  random: BattleRandom;
}

export interface BattleWarriorInitPayload {
  playerDeck: Deck;
  ownedCards: OwnedCard[];
  wins: number;
}

export type WarriorStatusList = BattleWarrior['statusEffects'];

export type { StatusEffect };
