import type { CardColor } from "@dealopoly/shared";
import type { GameState } from "../types/state.js";
import type { GameWonEvent } from "../types/events.js";

export function checkWinCondition(
  state: GameState,
  playerId: string,
): { isWon: boolean; completedColors: CardColor[]; completedSetsCount: number } {
  const player = state.players[playerId];
  if (!player) {
    return { isWon: false, completedColors: [], completedSetsCount: 0 };
  }

  const completedSets = player.propertySets.filter((s) => s.isComplete);
  const completedColors = completedSets.map((s) => s.color);

  // In Dealopoly, having 3 completed property sets wins the game
  const isWon = completedSets.length >= 3;
  return { isWon, completedColors, completedSetsCount: completedSets.length };
}

export function evaluateGameWinner(state: GameState): { nextState: GameState; wonEvent?: GameWonEvent } {
  if (state.status === "completed") {
    return { nextState: state };
  }

  // Prioritize active player, but check all players
  const playersToCheck = [
    state.turn.activePlayerId,
    ...state.playerOrder.filter((id) => id !== state.turn.activePlayerId),
  ];

  for (const playerId of playersToCheck) {
    const { isWon, completedColors, completedSetsCount } = checkWinCondition(state, playerId);

    if (isWon) {
      const player = state.players[playerId]!;
      const wonEvent: GameWonEvent = {
        id: `event-${Date.now()}-win`,
        timestamp: Date.now(),
        type: "game_won",
        playerId,
        winnerId: playerId,
        completedSetsCount,
        message: `🎉 ${player.name} WON THE GAME with 3 completed property sets (${completedColors.join(
          ", ",
        )})!`,
      };

      const nextState: GameState = {
        ...state,
        status: "completed",
        winnerId: playerId,
        history: [...state.history, wonEvent],
      };

      return { nextState, wonEvent };
    }
  }

  return { nextState: state };
}
