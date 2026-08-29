import type { GameState, CardInstance } from "../types/state.js";
import { GameEngineError } from "../types/errors.js";
import { createRng, shuffleDeck } from "../deck/shuffle.js";
import type { CardsDrawnEvent } from "../types/events.js";

export function drawCardsForActivePlayer(
  state: GameState,
  forceCount?: number,
): { nextState: GameState; drawnCards: CardInstance[]; events: CardsDrawnEvent[] } {
  const activePlayer = state.players[state.turn.activePlayerId];
  if (!activePlayer) {
    throw new GameEngineError("NOT_YOUR_TURN", "Active player not found in game state");
  }

  // Draw 5 if starting turn with empty hand, else standard 2
  const countNeeded = forceCount ?? (activePlayer.hand.length === 0 ? 5 : 2);

  let currentDeck = [...state.deck];
  let currentDiscard = [...state.discardPile];

  // If deck is depleted, reshuffle discard pile
  if (currentDeck.length < countNeeded && currentDiscard.length > 0) {
    const rng = createRng(state.seed + state.turn.turnNumber * 7919);
    const reshuffled = shuffleDeck(currentDiscard, rng);
    currentDeck = [...currentDeck, ...reshuffled];
    currentDiscard = [];
  }

  const actualDrawCount = Math.min(countNeeded, currentDeck.length);
  const drawnCards = currentDeck.slice(0, actualDrawCount);
  const remainingDeck = currentDeck.slice(actualDrawCount);

  const updatedPlayer = {
    ...activePlayer,
    hand: [...activePlayer.hand, ...drawnCards],
  };

  const drawEvent: CardsDrawnEvent = {
    id: `event-${Date.now()}-draw-${state.turn.turnNumber}`,
    timestamp: Date.now(),
    type: "cards_drawn",
    playerId: activePlayer.id,
    count: actualDrawCount,
    drawnCards,
    message: `${activePlayer.name} drew ${actualDrawCount} card(s).`,
  };

  const nextState: GameState = {
    ...state,
    deck: remainingDeck,
    discardPile: currentDiscard,
    players: {
      ...state.players,
      [activePlayer.id]: updatedPlayer,
    },
    turn: {
      ...state.turn,
      phase: "action",
    },
    history: [...state.history, drawEvent],
  };

  return { nextState, drawnCards, events: [drawEvent] };
}
