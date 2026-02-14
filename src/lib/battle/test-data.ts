import { Deck, OwnedCard, BattleAction, BattleState } from '@/types/game';
import { createSeededRandom } from '@/lib/rng';
import { applyTactic, initBattle, resolveCombat, selectAITactic } from '@/lib/battle-engine';

export interface DeterministicBattleInput {
  playerDeck: Deck;
  ownedCards: OwnedCard[];
  wins: number;
  seed: number;
  playerTacticIndex?: number | null;
}

export interface DeterministicBattleResult {
  initialState: BattleState;
  finalState: BattleState;
  actions: BattleAction[];
}

export const DETERMINISTIC_BATTLE_SEEDS = {
  baseline: 27182,
  highVariance: 314159,
  controlled: 8675309,
} as const;

function buildRandom(seed: number) {
  return createSeededRandom(seed);
}

export function runDeterministicBattle({
  playerDeck,
  ownedCards,
  wins,
  seed,
  playerTacticIndex = null,
}: DeterministicBattleInput): DeterministicBattleResult {
  const random = buildRandom(seed);
  const initialState = initBattle(playerDeck, ownedCards, wins, { random });
  const actions: BattleAction[] = [];

  let state = initialState;
  if (state.phase === 'tactic') {
    if (typeof playerTacticIndex === 'number') {
      const result = applyTactic(state, 'player', playerTacticIndex);
      state = result.state;
      if (result.action) actions.push(result.action);
    }

    const enemyTactic = selectAITactic(state);
    if (enemyTactic !== null) {
      const enemyResult = applyTactic(state, 'enemy', enemyTactic);
      state = enemyResult.state;
      if (enemyResult.action) actions.push(enemyResult.action);
    }
  }

  const needsCombat = state.player.warriors.some((w) => w.isAlive) && state.enemy.warriors.some((w) => w.isAlive);
  if (needsCombat) {
    const combatResult = resolveCombat(state, { random });
    state = combatResult.state;
    actions.push(...combatResult.actions);
  } else {
    state.result = state.enemy.warriors.some((w) => w.isAlive) ? 'lose' : 'win';
    state.phase = 'result';
    actions.push({ type: 'turn_end', newTurn: state.turn, phase: 'result', result: state.result, log: [] });
  }

  return { initialState, finalState: state, actions };
}
