import type { GameState, CardInstance } from "../types/state.js";
import { GameEngineError } from "../types/errors.js";
import type { CardsDiscardedEvent, TurnEndedEvent, TurnStartedEvent, GameEvent } from "../types/events.js";

export function advanceToNextTurn(state: GameState): { nextState: GameState; events: GameEvent[] } {
  const currentIndex = state.playerOrder.indexOf(state.turn.activePlayerId);
  const nextIndex = (currentIndex + 1) % state.playerOrder.length;
  const nextPlayerId = state.playerOrder[nextIndex]!;
  const nextPlayer = state.players[nextPlayerId]!;

  const turnEndedEvent: TurnEndedEvent = {
    id: `event-${Date.now()}-turn-end`,
    timestamp: Date.now(),
    type: "turn_ended",
    playerId: state.turn.activePlayerId,
    nextPlayerId,
    message: `Turn ${state.turn.turnNumber} ended.`,
  };

  const nextTurnNumber = state.turn.turnNumber + 1;
  const turnStartedEvent: TurnStartedEvent = {
    id: `event-${Date.now()}-turn-start-${nextTurnNumber}`,
    timestamp: Date.now(),
    type: "turn_started",
    playerId: nextPlayerId,
    turnNumber: nextTurnNumber,
    message: `Turn ${nextTurnNumber} started: ${nextPlayer.name}'s turn.`,
  };

  const nextState: GameState = {
    ...state,
    turn: {
      activePlayerId: nextPlayerId,
      actionsRemaining: 3,
      cardsPlayedThisTurn: 0,
      turnNumber: nextTurnNumber,
      phase: "draw",
    },
    pendingResolution: null,
    history: [...state.history, turnEndedEvent, turnStartedEvent],
  };

  return { nextState, events: [turnEndedEvent, turnStartedEvent] };
}

export function endTurn(state: GameState, playerId: string): { nextState: GameState; events: GameEvent[] } {
  if (state.turn.activePlayerId !== playerId) {
    throw new GameEngineError("NOT_YOUR_TURN", "Cannot end turn when it is not your turn");
  }

  if (state.pendingResolution) {
    throw new GameEngineError("MUST_RESOLVE_PENDING_ACTION", "Must resolve pending action before ending turn");
  }

  const player = state.players[playerId];
  if (!player) {
    throw new GameEngineError("NOT_YOUR_TURN", "Player not found");
  }

  // Check 7-card hand limit
  if (player.hand.length > 7) {
    const requiredDiscard = player.hand.length - 7;
    const nextState: GameState = {
      ...state,
      turn: {
        ...state.turn,
        phase: "discard",
      },
      pendingResolution: {
        type: "discard",
        playerId,
        requiredDiscardCount: requiredDiscard,
      },
    };
    return { nextState, events: [] };
  }

  return advanceToNextTurn(state);
}

export function discardCards(
  state: GameState,
  playerId: string,
  cardInstanceIds: string[],
): { nextState: GameState; events: GameEvent[] } {
  if (!state.pendingResolution || state.pendingResolution.type !== "discard") {
    throw new GameEngineError("MUST_RESOLVE_PENDING_ACTION", "No active discard requirement");
  }

  if (state.pendingResolution.playerId !== playerId) {
    throw new GameEngineError("NOT_YOUR_TURN", "Not waiting for your discard");
  }

  if (cardInstanceIds.length !== state.pendingResolution.requiredDiscardCount) {
    throw new GameEngineError(
      "INVALID_DISCARD_COUNT",
      `Expected ${state.pendingResolution.requiredDiscardCount} discarded card(s), got ${cardInstanceIds.length}`,
    );
  }

  const player = state.players[playerId];
  if (!player) {
    throw new GameEngineError("NOT_YOUR_TURN", "Player not found");
  }

  const discardedCards: CardInstance[] = [];
  for (const id of cardInstanceIds) {
    const card = player.hand.find((c) => c.instanceId === id);
    if (!card) {
      throw new GameEngineError("CARD_NOT_IN_HAND", `Card ${id} is not in hand to discard`);
    }
    discardedCards.push(card);
  }

  const discardSet = new Set(cardInstanceIds);
  const updatedHand = player.hand.filter((c) => !discardSet.has(c.instanceId));

  const discardEvent: CardsDiscardedEvent = {
    id: `event-${Date.now()}-discard`,
    timestamp: Date.now(),
    type: "cards_discarded",
    playerId,
    discardedCards,
    message: `${player.name} discarded ${discardedCards.length} card(s) to meet hand limit.`,
  };

  const stateWithDiscard: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        hand: updatedHand,
      },
    },
    discardPile: [...state.discardPile, ...discardedCards],
    history: [...state.history, discardEvent],
  };

  const { nextState, events } = advanceToNextTurn(stateWithDiscard);
  return { nextState, events: [discardEvent, ...events] };
}
