import type { CardColor } from "@dealopoly/shared";
import type { GameState, PropertySet, CardInstance } from "../types/state.js";
import { GameEngineError } from "../types/errors.js";
import type { RentChargedEvent } from "../types/events.js";

export function calculateSetRent(set: PropertySet, isDoubled = false): number {
  const cardCount = Math.min(set.cards.length, set.setSize);
  if (cardCount === 0) return 0;

  const baseRent = set.rentTiers[cardCount - 1] ?? 1;
  let total = baseRent;

  if (set.hasHouse) {
    total += 3;
  }
  if (set.hasHotel) {
    total += 4;
  }
  if (isDoubled) {
    total *= 2;
  }

  return total;
}

export function playRentCard(
  state: GameState,
  playerId: string,
  rentCardInstanceId: string,
  chosenColor: CardColor,
  targetPlayerId?: string,
  doubleRentCardInstanceId?: string,
): { nextState: GameState; events: RentChargedEvent[] } {
  const player = state.players[playerId];
  if (!player) {
    throw new GameEngineError("NOT_YOUR_TURN", "Player not found");
  }

  const rentCardIndex = player.hand.findIndex((c) => c.instanceId === rentCardInstanceId);
  if (rentCardIndex === -1) {
    throw new GameEngineError("CARD_NOT_IN_HAND", "Rent card is not in player's hand");
  }

  const rentCard = player.hand[rentCardIndex]!;
  if (rentCard.type !== "rent") {
    throw new GameEngineError("INVALID_CARD_TYPE", `Cannot play ${rentCard.type} as a rent card`);
  }

  // Validate color matches rent card
  if (rentCard.primaryColor !== "all") {
    if (rentCard.primaryColor !== chosenColor && rentCard.secondaryColor !== chosenColor) {
      throw new GameEngineError(
        "RENT_COLOR_MISMATCH",
        `Rent card is for ${rentCard.primaryColor}/${rentCard.secondaryColor}, cannot charge ${chosenColor}`,
      );
    }
  }

  // Find player's property set of the chosen color
  const ownedSets = player.propertySets.filter((s) => s.color === chosenColor);
  if (ownedSets.length === 0) {
    throw new GameEngineError("RENT_COLOR_NOT_OWNED", `Player does not own any ${chosenColor} property cards`);
  }

  // Use the highest-value set if multiple exist
  const bestSet = ownedSets.reduce((best, cur) =>
    calculateSetRent(cur) > calculateSetRent(best) ? cur : best,
  );

  let isDoubled = false;
  let actionsCost = 1;
  let doubleRentCard: CardInstance | undefined;

  if (doubleRentCardInstanceId) {
    if (state.turn.actionsRemaining < 2) {
      throw new GameEngineError("NO_ACTIONS_REMAINING", "Playing Double The Rent requires 2 available actions");
    }

    const doubleIndex = player.hand.findIndex((c) => c.instanceId === doubleRentCardInstanceId);
    if (doubleIndex === -1) {
      throw new GameEngineError("CARD_NOT_IN_HAND", "Double The Rent card is not in player's hand");
    }

    doubleRentCard = player.hand[doubleIndex]!;
    if (doubleRentCard.defId !== "action-double-the-rent") {
      throw new GameEngineError("INVALID_CARD_TYPE", "Specified card is not a Double The Rent card");
    }

    isDoubled = true;
    actionsCost = 2;
  }

  const rentAmount = calculateSetRent(bestSet, isDoubled);

  // Determine target opponents
  let targetOpponents: string[] = [];
  if (rentCard.primaryColor === "all") {
    // 10-color Wild Rent targets exactly 1 player
    if (!targetPlayerId) {
      throw new GameEngineError("INVALID_ACTION_TARGET", "Wild Rent card requires specifying a target opponent");
    }
    if (targetPlayerId === playerId) {
      throw new GameEngineError("CANNOT_TARGET_SELF", "Cannot target yourself with rent");
    }
    if (!state.players[targetPlayerId]) {
      throw new GameEngineError("TARGET_PLAYER_NOT_FOUND", "Target player does not exist");
    }
    targetOpponents = [targetPlayerId];
  } else {
    // Standard dual rent targets ALL opponents
    targetOpponents = state.playerOrder.filter((pId) => pId !== playerId);
  }

  const cardsToRemove = [rentCardInstanceId];
  if (doubleRentCardInstanceId) {
    cardsToRemove.push(doubleRentCardInstanceId);
  }

  const updatedHand = player.hand.filter((c) => !cardsToRemove.includes(c.instanceId));
  const newDiscards = [rentCard];
  if (doubleRentCard) {
    newDiscards.push(doubleRentCard);
  }

  const event: RentChargedEvent = {
    id: `event-${Date.now()}-rent`,
    timestamp: Date.now(),
    type: "rent_charged",
    playerId,
    rentCard,
    color: chosenColor,
    amount: rentAmount,
    targetPlayerIds: targetOpponents,
    isDoubled,
    message: `${player.name} charged $${rentAmount}M rent for ${chosenColor} properties${
      isDoubled ? " (DOUBLED!)" : ""
    }.`,
  };

  const firstTarget = targetOpponents[0]!;
  const remainingTargets = targetOpponents.slice(1);

  // Check if first target has Just Say No in hand
  const targetPlayer = state.players[firstTarget];
  const targetHasJSN = targetPlayer?.hand.some((c) => c.defId === "action-just-say-no");

  let pendingResolution = state.pendingResolution;

  if (targetHasJSN) {
    // Open reaction window for target
    pendingResolution = {
      type: "reaction_window",
      initiatorPlayerId: playerId,
      targetPlayerId: firstTarget,
      actionCard: rentCard,
      rentAmount,
      doubleRent: isDoubled,
      waitingForPlayerId: firstTarget,
      justSayNoChainCount: 0,
      isCancelled: false,
      remainingTargets,
    };
  } else {
    // Direct payment request
    pendingResolution = {
      type: "payment",
      creditorPlayerId: playerId,
      debtorPlayerId: firstTarget,
      amountDue: rentAmount,
      remainingDebtors: remainingTargets,
      reason: `Rent for ${chosenColor} properties ($${rentAmount}M)`,
    };
  }

  const nextState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        hand: updatedHand,
      },
    },
    discardPile: [...state.discardPile, ...newDiscards],
    turn: {
      ...state.turn,
      actionsRemaining: state.turn.actionsRemaining - actionsCost,
      cardsPlayedThisTurn: state.turn.cardsPlayedThisTurn + actionsCost,
    },
    pendingResolution,
    history: [...state.history, event],
  };

  return { nextState, events: [event] };
}
