import type {
  LeastCountCard,
} from "./deck.js";
import { createLeastCountDeck } from "./deck.js";
import type {
  LeastCountGameState,
  LeastCountEvent,
  ShowResult,
  LeastCountConfig,
} from "./types.js";

/**
 * Calculates total point value of a hand of cards
 */
export function calculateHandScore(cards: LeastCountCard[]): number {
  return cards.reduce((sum, c) => sum + (c.isJoker ? 0 : c.points), 0);
}

/**
 * Validates whether a selection of cards is a legal discard move:
 * 1. Single card (any card)
 * 2. Set/Group: 2 or more cards of the exact same rank (e.g. 7-7 or 7-7-7, Jokers allowed)
 * 3. Sequence/Run: 3 or more consecutive cards in the same suit (e.g. 4♥-5♥-6♥, Jokers allowed)
 */
export function validateDiscardCombination(cards: LeastCountCard[]): { valid: boolean; reason?: string } {
  if (!cards || cards.length === 0) {
    return { valid: false, reason: "Must select at least one card to discard" };
  }

  // 1. Single card is always valid
  if (cards.length === 1) {
    return { valid: true };
  }

  const nonJokers = cards.filter((c) => !c.isJoker);
  const jokerCount = cards.length - nonJokers.length;

  // If all cards are Jokers, it's valid as a group of Jokers
  if (nonJokers.length === 0) {
    return { valid: true };
  }

  // 2. Check for Set / Group (Same Rank)
  const firstRank = nonJokers[0]!.rank;
  const isSameRankSet = nonJokers.every((c) => c.rank === firstRank);
  if (isSameRankSet) {
    return { valid: true };
  }

  // 3. Check for Sequence / Run (3+ cards of same suit in consecutive order)
  if (cards.length >= 3) {
    const suit = nonJokers[0]!.suit;
    const isSameSuit = nonJokers.every((c) => c.suit === suit);

    if (isSameSuit) {
      // Sort non-joker cards by rank numeric value
      const sorted = [...nonJokers].sort((a, b) => a.rankValue - b.rankValue);

      // Check for duplicate ranks in run (not allowed in a sequence)
      let hasDuplicates = false;
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i]!.rankValue === sorted[i + 1]!.rankValue) {
          hasDuplicates = true;
          break;
        }
      }

      if (!hasDuplicates) {
        // Calculate gaps between consecutive cards
        let neededJokers = 0;
        for (let i = 0; i < sorted.length - 1; i++) {
          const gap = sorted[i + 1]!.rankValue - sorted[i]!.rankValue - 1;
          neededJokers += gap;
        }

        if (neededJokers <= jokerCount) {
          return { valid: true };
        }
      }
    }
  }

  return {
    valid: false,
    reason: "Invalid discard. Must be a single card, a matching set (same rank), or a 3+ card run in the same suit.",
  };
}

/**
 * Shuffles an array in place with a pseudorandom or Math.random generator
 */
export function shuffleArray<T>(array: T[], seed?: number): T[] {
  const arr = [...array];
  let s = seed ?? Date.now();
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = temp;
  }
  return arr;
}

/**
 * Initializes a new Least Count game session
 */
export function createLeastCountGame(options: {
  gameId?: string;
  seed?: number;
  players: Array<{ id: string; name: string; isBot?: boolean }>;
  config?: LeastCountConfig;
}): LeastCountGameState {
  const { players, seed = Date.now(), gameId = `lc-${Date.now()}`, config } = options;

  if (players.length < 2 || players.length > 6) {
    throw new Error(`Least Count requires 2 to 6 players (provided: ${players.length})`);
  }

  const showThreshold = config?.showThreshold ?? 7;
  const maxScore = config?.maxScore ?? 100;
  const wrongShowPenalty = config?.wrongShowPenalty ?? 40;
  const includeJokers = config?.includeJokers ?? true;

  let deck = shuffleArray(createLeastCountDeck(includeJokers), seed);
  const playerStates: Record<string, any> = {};
  const playerOrder = players.map((p) => p.id);

  // Deal 5 cards to each player
  for (const p of players) {
    const hand = deck.slice(0, 5);
    deck = deck.slice(5);

    playerStates[p.id] = {
      id: p.id,
      name: p.name,
      isBot: Boolean(p.isBot),
      hand,
      score: 0,
      roundScore: calculateHandScore(hand),
      isEliminated: false,
    };
  }

  // First card of draw pile starts the discard pile
  const firstDiscard = deck.shift()!;
  const discardPile = [firstDiscard];

  return {
    id: gameId,
    gameType: "least_count",
    status: "in_progress",
    roundNumber: 1,
    turnNumber: 1,
    turnPhase: "discard",
    activePlayerId: playerOrder[0]!,
    playerOrder,
    players: playerStates,
    drawPile: deck,
    discardPile,
    lastDiscardedCards: [firstDiscard],
    showThreshold,
    maxScore,
    wrongShowPenalty,
  };
}

/**
 * Handles discarding cards on player's turn
 */
export function handleDiscardCards(
  state: LeastCountGameState,
  playerId: string,
  cardInstanceIds: string[],
): { state: LeastCountGameState; events: LeastCountEvent[] } {
  if (state.status !== "in_progress") {
    throw new Error("Game is not in progress");
  }
  if (state.activePlayerId !== playerId) {
    throw new Error("It is not your turn");
  }
  if (state.turnPhase !== "discard") {
    throw new Error("You have already discarded; you must draw a card to complete your turn");
  }

  const player = state.players[playerId];
  if (!player) throw new Error("Player not found");

  const cardsToDiscard = player.hand.filter((c) => cardInstanceIds.includes(c.instanceId));
  if (cardsToDiscard.length !== cardInstanceIds.length) {
    throw new Error("One or more selected cards are not in your hand");
  }

  const validation = validateDiscardCombination(cardsToDiscard);
  if (!validation.valid) {
    throw new Error(validation.reason || "Invalid discard combination");
  }

  // Remove from hand and push to discard pile
  const nextHand = player.hand.filter((c) => !cardInstanceIds.includes(c.instanceId));
  const nextDiscardPile = [...state.discardPile, ...cardsToDiscard];

  const nextPlayer = {
    ...player,
    hand: nextHand,
    roundScore: calculateHandScore(nextHand),
  };

  const nextState: LeastCountGameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: nextPlayer,
    },
    discardPile: nextDiscardPile,
    lastDiscardedCards: cardsToDiscard,
    turnPhase: "draw",
  };

  const discardNames = cardsToDiscard.map((c) => (c.isJoker ? "Joker" : `${c.rank}${c.suit.charAt(0).toUpperCase()}`)).join(", ");
  const events: LeastCountEvent[] = [
    {
      id: `evt-${Date.now()}-1`,
      type: "cards_discarded",
      playerId,
      timestamp: Date.now(),
      message: `${player.name} discarded ${cardsToDiscard.length} card(s): [${discardNames}]`,
      payload: { cards: cardsToDiscard },
    },
  ];

  return { state: nextState, events };
}

/**
 * Handles drawing a card from draw pile or top of discard pile
 */
export function handleDrawCard(
  state: LeastCountGameState,
  playerId: string,
  source: "deck" | "discard",
): { state: LeastCountGameState; events: LeastCountEvent[] } {
  if (state.status !== "in_progress") {
    throw new Error("Game is not in progress");
  }
  if (state.activePlayerId !== playerId) {
    throw new Error("It is not your turn");
  }
  if (state.turnPhase !== "draw") {
    throw new Error("You must discard cards before drawing");
  }

  const player = state.players[playerId];
  if (!player) throw new Error("Player not found");

  let nextDrawPile = [...state.drawPile];
  let nextDiscardPile = [...state.discardPile];
  let drawnCard: LeastCountCard | undefined;
  const events: LeastCountEvent[] = [];

  if (source === "discard") {
    if (nextDiscardPile.length === 0) {
      throw new Error("Discard pile is empty");
    }
    // Player draws the topmost card of the discard pile (prior to current turn discards)
    drawnCard = nextDiscardPile.pop()!;
  } else {
    // Draw from closed draw pile
    if (nextDrawPile.length === 0) {
      // Reshuffle discard pile except the top cards
      if (nextDiscardPile.length <= 1) {
        throw new Error("No cards available to draw");
      }
      const topCards = nextDiscardPile.slice(-state.lastDiscardedCards.length);
      const toShuffle = nextDiscardPile.slice(0, -state.lastDiscardedCards.length);
      nextDrawPile = shuffleArray(toShuffle);
      nextDiscardPile = topCards;

      events.push({
        id: `evt-${Date.now()}-reshuffle`,
        type: "deck_reshuffled",
        timestamp: Date.now(),
        message: "Draw pile was empty. Discard pile reshuffled into new draw pile.",
      });
    }
    drawnCard = nextDrawPile.shift()!;
  }

  const nextHand = [...player.hand, drawnCard];
  const nextPlayer = {
    ...player,
    hand: nextHand,
    roundScore: calculateHandScore(nextHand),
  };

  // Advance turn to next active (non-eliminated) player
  const activePlayers = state.playerOrder.filter((id) => !state.players[id]?.isEliminated);
  const currentIndex = activePlayers.indexOf(playerId);
  const nextPlayerId = activePlayers[(currentIndex + 1) % activePlayers.length]!;

  const nextState: LeastCountGameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: nextPlayer,
    },
    drawPile: nextDrawPile,
    discardPile: nextDiscardPile,
    turnPhase: "discard",
    turnNumber: state.turnNumber + 1,
    activePlayerId: nextPlayerId,
  };

  events.push({
    id: `evt-${Date.now()}-draw`,
    type: "card_drawn",
    playerId,
    timestamp: Date.now(),
    message: `${player.name} drew 1 card from ${source === "discard" ? "discard pile" : "closed deck"}`,
  });

  return { state: nextState, events };
}

/**
 * Handles Declaring "Show"
 */
export function handleDeclareShow(
  state: LeastCountGameState,
  playerId: string,
): { state: LeastCountGameState; events: LeastCountEvent[] } {
  if (state.status !== "in_progress") {
    throw new Error("Game is not in progress");
  }
  if (state.activePlayerId !== playerId) {
    throw new Error("You can only declare Show on your turn");
  }
  if (state.turnPhase !== "discard") {
    throw new Error("You can only declare Show at the beginning of your turn before discarding");
  }

  const caller = state.players[playerId];
  if (!caller) throw new Error("Caller not found");

  const callerScore = calculateHandScore(caller.hand);
  if (callerScore > state.showThreshold) {
    throw new Error(
      `Cannot declare Show with ${callerScore} points. Total points must be ${state.showThreshold} or less.`,
    );
  }

  // Calculate scores for all active players
  const activePlayerIds = state.playerOrder.filter((id) => !state.players[id]?.isEliminated);
  const playerScores: Record<string, { handScore: number; penaltyAdded: number; totalScore: number }> = {};

  let minScore = Infinity;
  let minPlayerId = playerId;

  for (const pid of activePlayerIds) {
    const p = state.players[pid]!;
    const hScore = calculateHandScore(p.hand);
    if (hScore < minScore) {
      minScore = hScore;
      minPlayerId = pid;
    }
  }

  // Check if caller was successfully lowest OR if someone matched/beat them (wrong show)
  const isSuccessful = minPlayerId === playerId && activePlayerIds.filter((pid) => pid !== playerId).every((pid) => calculateHandScore(state.players[pid]!.hand) > callerScore);

  const updatedPlayers: Record<string, any> = {};

  for (const pid of state.playerOrder) {
    const p = state.players[pid]!;
    if (p.isEliminated) {
      updatedPlayers[pid] = { ...p };
      continue;
    }

    const hScore = calculateHandScore(p.hand);
    let penalty = 0;

    if (isSuccessful) {
      // Caller gets 0, everyone else gets their hand score
      penalty = pid === playerId ? 0 : hScore;
    } else {
      // Wrong Show / Countered!
      if (pid === playerId) {
        penalty = hScore + state.wrongShowPenalty;
      } else if (pid === minPlayerId) {
        penalty = 0; // Lowest opponent gets 0
      } else {
        penalty = hScore;
      }
    }

    const newScore = p.score + penalty;
    const isEliminated = newScore > state.maxScore;

    playerScores[pid] = {
      handScore: hScore,
      penaltyAdded: penalty,
      totalScore: newScore,
    };

    updatedPlayers[pid] = {
      ...p,
      score: newScore,
      roundScore: hScore,
      isEliminated,
    };
  }

  // Check for remaining active players
  const remainingPlayers = state.playerOrder.filter((id) => !updatedPlayers[id]?.isEliminated);
  let isGameCompleted = false;
  let overallWinnerId: string | undefined;

  if (remainingPlayers.length <= 1) {
    isGameCompleted = true;
    overallWinnerId = remainingPlayers[0] || minPlayerId;
  }

  const showResult: ShowResult = {
    callerPlayerId: playerId,
    callerScore,
    isSuccessful,
    lowestScore: minScore,
    winnerPlayerId: isSuccessful ? playerId : minPlayerId,
    playerScores,
  };

  const nextState: LeastCountGameState = {
    ...state,
    status: isGameCompleted ? "completed" : "round_end",
    turnPhase: "round_end",
    players: updatedPlayers,
    winnerId: overallWinnerId,
    lastShowResult: showResult,
  };

  const winnerName = state.players[showResult.winnerPlayerId]?.name || "Winner";
  const events: LeastCountEvent[] = [
    {
      id: `evt-${Date.now()}-show`,
      type: "show_declared",
      playerId,
      timestamp: Date.now(),
      message: isSuccessful
        ? `${caller.name} declared SHOW with ${callerScore} points and WON the round!`
        : `${caller.name} declared SHOW with ${callerScore} points but was COUNTERED by ${winnerName} (${minScore} pts)! +${state.wrongShowPenalty} penalty!`,
      payload: { showResult },
    },
  ];

  if (isGameCompleted) {
    events.push({
      id: `evt-${Date.now()}-gameover`,
      type: "game_completed",
      playerId: overallWinnerId,
      timestamp: Date.now(),
      message: `Game over! ${state.players[overallWinnerId!]?.name} won the match!`,
    });
  }

  return { state: nextState, events };
}

/**
 * Starts next round in match
 */
export function handleStartNextRound(
  state: LeastCountGameState,
  playerId: string,
): { state: LeastCountGameState; events: LeastCountEvent[] } {
  if (state.status !== "round_end") {
    throw new Error("Game is not in round_end state");
  }

  const remainingPlayers = state.playerOrder.filter((id) => !state.players[id]?.isEliminated);
  if (remainingPlayers.length <= 1) {
    throw new Error("Game is already completed");
  }

  let deck = shuffleArray(createLeastCountDeck(true), Date.now());
  const updatedPlayers: Record<string, any> = {};

  for (const pid of state.playerOrder) {
    const p = state.players[pid]!;
    if (p.isEliminated) {
      updatedPlayers[pid] = { ...p, hand: [] };
      continue;
    }

    const hand = deck.slice(0, 5);
    deck = deck.slice(5);

    updatedPlayers[pid] = {
      ...p,
      hand,
      roundScore: calculateHandScore(hand),
    };
  }

  const firstDiscard = deck.shift()!;
  const nextRoundNumber = state.roundNumber + 1;

  const nextState: LeastCountGameState = {
    ...state,
    status: "in_progress",
    roundNumber: nextRoundNumber,
    turnNumber: 1,
    turnPhase: "discard",
    activePlayerId: state.lastShowResult?.winnerPlayerId && !state.players[state.lastShowResult.winnerPlayerId]?.isEliminated
      ? state.lastShowResult.winnerPlayerId
      : remainingPlayers[0]!,
    players: updatedPlayers,
    drawPile: deck,
    discardPile: [firstDiscard],
    lastDiscardedCards: [firstDiscard],
    lastShowResult: undefined,
  };

  const events: LeastCountEvent[] = [
    {
      id: `evt-${Date.now()}-round-start`,
      type: "next_round_started",
      timestamp: Date.now(),
      message: `Round ${nextRoundNumber} started!`,
    },
  ];

  return { state: nextState, events };
}
