import type { GameState, PlayerState } from "../types/state.js";
import { GameEngineError } from "../types/errors.js";
import { createStandardDeck } from "../deck/factory.js";
import { createRng, shuffleDeck } from "../deck/shuffle.js";
import type { GameStartedEvent } from "../types/events.js";

export interface GamePlayerConfig {
  id: string;
  name: string;
  isBot?: boolean;
}

export interface CreateGameOptions {
  gameId?: string;
  seed?: number;
  players: GamePlayerConfig[];
}

export function createGame(options: CreateGameOptions): GameState {
  const { players, seed = Date.now(), gameId = `game-${Date.now()}` } = options;

  if (players.length < 2 || players.length > 5) {
    throw new GameEngineError(
      "UNKNOWN_ERROR",
      `Dealopoly requires 2 to 5 players (provided: ${players.length})`,
    );
  }

  const rng = createRng(seed);
  let deck = shuffleDeck(createStandardDeck(), rng);

  const playerOrder = players.map((p) => p.id);
  const playerStates: Record<string, PlayerState> = {};

  // Deal 5 cards to each player
  for (const player of players) {
    const hand = deck.slice(0, 5);
    deck = deck.slice(5);

    playerStates[player.id] = {
      id: player.id,
      name: player.name,
      isBot: Boolean(player.isBot),
      hand,
      bank: [],
      propertySets: [],
    };
  }

  const firstPlayerId = playerOrder[0]!;

  const startEvent: GameStartedEvent = {
    id: `event-${Date.now()}-start`,
    timestamp: Date.now(),
    type: "game_started",
    playerOrder,
    message: `Game started with ${players.length} players. First turn: ${players[0]?.name}`,
  };

  const state: GameState = {
    id: gameId,
    seed,
    status: "in_progress",
    players: playerStates,
    playerOrder,
    turn: {
      activePlayerId: firstPlayerId,
      actionsRemaining: 3,
      cardsPlayedThisTurn: 0,
      turnNumber: 1,
      phase: "draw",
    },
    deck,
    discardPile: [],
    pendingResolution: null,
    winnerId: null,
    history: [startEvent],
  };

  return state;
}
