import type {
  LeastCountGameState,
  LeastCountCommand,
} from "./types.js";
import {
  calculateHandScore,
  validateDiscardCombination,
} from "./rules.js";
import type { LeastCountCard } from "./deck.js";

export class LeastCountBotController {
  /**
   * Computes the next legal and strategic move for a Least Count bot player
   */
  public static getNextBotAction(
    state: LeastCountGameState,
    botPlayerId: string,
  ): LeastCountCommand | null {
    if (state.status === "completed") return null;

    if (state.status === "round_end") {
      return {
        type: "start_next_round",
        playerId: botPlayerId,
      };
    }

    if (state.activePlayerId !== botPlayerId) {
      return null;
    }

    const bot = state.players[botPlayerId];
    if (!bot || bot.isEliminated) return null;

    // 1. Discard Phase
    if (state.turnPhase === "discard") {
      const handScore = calculateHandScore(bot.hand);

      // A. If hand score <= showThreshold (e.g. <= 7), declare Show!
      if (handScore <= state.showThreshold) {
        return {
          type: "declare_show",
          playerId: botPlayerId,
        };
      }

      // B. Find best discard combination to maximize points shed
      const bestDiscard = this.findBestDiscard(bot.hand);
      return {
        type: "discard_cards",
        playerId: botPlayerId,
        cardInstanceIds: bestDiscard.map((c) => c.instanceId),
      };
    }

    // 2. Draw Phase
    if (state.turnPhase === "draw") {
      const discardTop = state.discardPile.length > 0
        ? state.discardPile[state.discardPile.length - 1]
        : undefined;

      // Draw from discard pile if it is low point value (K=0 pts, A=1 pt, 2 pts) or matches rank with hand
      if (discardTop) {
        const isLowValue = discardTop.rank === "K" || discardTop.points <= 2;
        const matchesHandRank = bot.hand.some((c) => c.rank === discardTop.rank);

        if (isLowValue || matchesHandRank) {
          return {
            type: "draw_card",
            playerId: botPlayerId,
            source: "discard",
          };
        }
      }

      // Default: draw from closed draw pile
      return {
        type: "draw_card",
        playerId: botPlayerId,
        source: "deck",
      };
    }

    return null;
  }

  /**
   * Evaluates hand and finds the legal discard combination that sheds the highest point total:
   * 1. 3-card sequences of same suit (e.g. 10-J-Q = 33 pts)
   * 2. 2-card pairs of same rank (e.g. Q-Q = 24 pts)
   * 3. Single card with highest point value (e.g. Q = 12 pts, J = 11 pts)
   */
  private static findBestDiscard(hand: LeastCountCard[]): LeastCountCard[] {
    if (hand.length === 0) return [];
    if (hand.length === 1) return [hand[0]!];

    let bestCombination: LeastCountCard[] = [];
    let maxPointsDropped = -1;

    // 1. Evaluate 3-card sequences in same suit
    if (hand.length >= 3) {
      const combinations = this.getCombinations(hand, 3);
      for (const combo of combinations) {
        if (validateDiscardCombination(combo).valid) {
          const points = combo.reduce((sum, c) => sum + c.points, 0);
          if (points > maxPointsDropped) {
            maxPointsDropped = points;
            bestCombination = combo;
          }
        }
      }
    }

    // 2. Evaluate pairs of exact same rank
    for (let i = 0; i < hand.length; i++) {
      for (let j = i + 1; j < hand.length; j++) {
        const pair = [hand[i]!, hand[j]!];
        if (validateDiscardCombination(pair).valid) {
          const points = pair.reduce((sum, c) => sum + c.points, 0);
          if (points > maxPointsDropped) {
            maxPointsDropped = points;
            bestCombination = pair;
          }
        }
      }
    }

    // 3. Fallback: single card with highest points (Never discard King if possible, since King is 0 pts!)
    if (bestCombination.length === 0) {
      const sortedByPoints = [...hand].sort((a, b) => b.points - a.points);
      bestCombination = [sortedByPoints[0]!];
    }

    return bestCombination;
  }

  private static getCombinations<T>(array: T[], size: number): T[][] {
    if (size === 1) return array.map((item) => [item]);
    const result: T[][] = [];
    for (let i = 0; i <= array.length - size; i++) {
      const head = array[i]!;
      const tailCombinations = this.getCombinations(array.slice(i + 1), size - 1);
      for (const tail of tailCombinations) {
        result.push([head, ...tail]);
      }
    }
    return result;
  }
}
