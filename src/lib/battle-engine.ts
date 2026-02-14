import { BattleAction, BattleState, Deck, OwnedCard } from '@/types/game';
import { initBattle as initBattleCore } from '@/lib/battle/init';
import { resolveCombat as resolveCombatCore, getFirstAlive } from '@/lib/battle/combat';
import { applyTactic as applyTacticCore } from '@/lib/battle/skills/tactics';
import { selectAITactic } from '@/lib/battle/ai';
import { BattleEngineOptions } from '@/lib/battle/types';

export { selectAITactic };

export function initBattle(
  playerDeck: Deck,
  ownedCards: OwnedCard[],
  wins = 0,
  options: BattleEngineOptions = {},
): BattleState {
  return initBattleCore(playerDeck, ownedCards, wins, options);
}

export { getFirstAlive };

export function applyTactic(
  state: BattleState,
  side: 'player' | 'enemy',
  tacticIndex: number,
): { state: BattleState; action: BattleAction | null } {
  return applyTacticCore(state, side, tacticIndex);
}

export function resolveCombat(
  state: BattleState,
  options: BattleEngineOptions = {},
): { state: BattleState; actions: BattleAction[] } {
  return resolveCombatCore(state, options);
}
