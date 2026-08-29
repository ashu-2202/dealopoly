import type { CardColor } from "@dealopoly/shared";
import { COLOR_CONFIG } from "@dealopoly/shared";
import type { GameState, PropertySet, CardInstance } from "../types/state.js";
import { GameEngineError } from "../types/errors.js";
import type { PropertyPlayedEvent, WildReorganizedEvent } from "../types/events.js";

export function createNewPropertySet(color: CardColor, firstCard: CardInstance): PropertySet {
  const config = COLOR_CONFIG[color];
  if (!config || color === "all") {
    throw new GameEngineError("INVALID_PROPERTY_COLOR", `Invalid property color: ${color}`);
  }

  const set: PropertySet = {
    setId: `set-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${color}`,
    color,
    cards: [firstCard],
    hasHouse: false,
    hasHotel: false,
    isComplete: config.setSize === 1,
    setSize: config.setSize,
    rentTiers: config.rentTiers,
  };

  return set;
}

export function validateWildColor(card: CardInstance, chosenColor: CardColor): void {
  if (chosenColor === "all") {
    throw new GameEngineError("INVALID_WILD_COLOR", "Wild card cannot have color 'all'");
  }

  if (card.primaryColor === "all") {
    // Multicolor wild can be any standard color
    return;
  }

  if (card.primaryColor !== chosenColor && card.secondaryColor !== chosenColor) {
    throw new GameEngineError(
      "INVALID_WILD_COLOR",
      `Wild card cannot be used as ${chosenColor}. Valid colors: ${card.primaryColor}, ${card.secondaryColor}`,
    );
  }
}

export function playPropertyCard(
  state: GameState,
  playerId: string,
  cardInstanceId: string,
  targetSetId?: string,
  chosenColor?: CardColor,
): { nextState: GameState; events: PropertyPlayedEvent[] } {
  const player = state.players[playerId];
  if (!player) {
    throw new GameEngineError("NOT_YOUR_TURN", "Player not found");
  }

  const cardIndex = player.hand.findIndex((c) => c.instanceId === cardInstanceId);
  if (cardIndex === -1) {
    throw new GameEngineError("CARD_NOT_IN_HAND", "Card is not in player's hand");
  }

  const card = player.hand[cardIndex]!;
  if (card.type !== "property" && card.type !== "property-wild") {
    throw new GameEngineError("INVALID_CARD_TYPE", `Cannot play ${card.type} as a property`);
  }

  // Determine property color
  let assignedColor: CardColor;
  if (card.type === "property") {
    if (!card.primaryColor) {
      throw new GameEngineError("INVALID_PROPERTY_COLOR", "Property card missing primary color");
    }
    assignedColor = card.primaryColor;
  } else {
    // Wild card
    if (!chosenColor) {
      throw new GameEngineError("INVALID_WILD_COLOR", "Must specify chosen color for wild card");
    }
    validateWildColor(card, chosenColor);
    assignedColor = chosenColor;
  }

  const cardWithColor: CardInstance = {
    ...card,
    currentColor: assignedColor,
  };

  const remainingHand = player.hand.filter((_, idx) => idx !== cardIndex);
  const updatedSets = [...player.propertySets];
  let targetSet: PropertySet;
  let isNewSet = false;

  let effectiveTargetSetId = targetSetId;
  if (!effectiveTargetSetId) {
    // Automatically find an existing incomplete property set of the same color
    const matchingIncomplete = updatedSets.find(
      (s) => s.color === assignedColor && !s.isComplete,
    );
    if (matchingIncomplete) {
      effectiveTargetSetId = matchingIncomplete.setId;
    }
  }

  // Wild Property Card validation: cannot start a new set if no property of that color is present
  if (card.type === "property-wild" && !effectiveTargetSetId) {
    throw new GameEngineError(
      "WILD_CARD_REQUIRES_EXISTING_PROPERTY",
      `Cannot play a Wild Property Card as ${assignedColor.toUpperCase()} without an existing property card of that color already on your table`,
    );
  }

  if (effectiveTargetSetId) {
    const existingIndex = updatedSets.findIndex((s) => s.setId === effectiveTargetSetId);
    if (existingIndex === -1) {
      throw new GameEngineError("PROPERTY_SET_NOT_FOUND", "Specified property set not found");
    }

    const existingSet = updatedSets[existingIndex]!;
    if (existingSet.color !== assignedColor) {
      throw new GameEngineError(
        "INVALID_PROPERTY_COLOR",
        `Set color mismatch: set is ${existingSet.color}, card is ${assignedColor}`,
      );
    }
    if (existingSet.isComplete) {
      throw new GameEngineError("CANNOT_ADD_TO_COMPLETED_SET", "Cannot add card to an already completed set");
    }

    const newCards = [...existingSet.cards, cardWithColor];
    targetSet = {
      ...existingSet,
      cards: newCards,
      isComplete: newCards.length >= existingSet.setSize,
    };
    updatedSets[existingIndex] = targetSet;
  } else {
    // Create new set (only for standard property cards)
    targetSet = createNewPropertySet(assignedColor, cardWithColor);
    updatedSets.push(targetSet);
    isNewSet = true;
  }

  const event: PropertyPlayedEvent = {
    id: `event-${Date.now()}-prop`,
    timestamp: Date.now(),
    type: "property_played",
    playerId,
    card: cardWithColor,
    targetSetId: targetSet.setId,
    color: assignedColor,
    isNewSet,
    setCompleted: targetSet.isComplete,
    message: `${player.name} played ${card.name} into ${assignedColor} set${targetSet.isComplete ? " (Completed Set!)" : ""}.`,
  };

  const nextState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        hand: remainingHand,
        propertySets: updatedSets,
      },
    },
    turn: {
      ...state.turn,
      actionsRemaining: state.turn.actionsRemaining - 1,
      cardsPlayedThisTurn: state.turn.cardsPlayedThisTurn + 1,
    },
    history: [...state.history, event],
  };

  return { nextState, events: [event] };
}

export function reorganizeWildCard(
  state: GameState,
  playerId: string,
  cardInstanceId: string,
  fromSetId: string,
  toSetId?: string,
  newColor?: CardColor,
): { nextState: GameState; events: WildReorganizedEvent[] } {
  const player = state.players[playerId];
  if (!player) {
    throw new GameEngineError("NOT_YOUR_TURN", "Player not found");
  }

  const fromSetIndex = player.propertySets.findIndex((s) => s.setId === fromSetId);
  if (fromSetIndex === -1) {
    throw new GameEngineError("PROPERTY_SET_NOT_FOUND", "Source property set not found");
  }

  const fromSet = player.propertySets[fromSetIndex]!;
  const cardIndex = fromSet.cards.findIndex((c) => c.instanceId === cardInstanceId);
  if (cardIndex === -1) {
    throw new GameEngineError("CARD_NOT_IN_SET", "Wild card not found in source property set");
  }

  const card = fromSet.cards[cardIndex]!;
  if (card.type !== "property-wild") {
    throw new GameEngineError("INVALID_CARD_TYPE", "Only wild cards can be reorganized");
  }

  if (!newColor) {
    throw new GameEngineError("INVALID_WILD_COLOR", "Must provide new color for wild card");
  }

  validateWildColor(card, newColor);

  const updatedCard: CardInstance = {
    ...card,
    currentColor: newColor,
  };

  // Remove card from source set
  const fromSetRemainingCards = fromSet.cards.filter((_, idx) => idx !== cardIndex);
  let updatedSets = [...player.propertySets];

  if (fromSetRemainingCards.length === 0 && !fromSet.hasHouse && !fromSet.hasHotel) {
    // Delete empty set if no buildings attached
    updatedSets = updatedSets.filter((_, idx) => idx !== fromSetIndex);
  } else {
    updatedSets[fromSetIndex] = {
      ...fromSet,
      cards: fromSetRemainingCards,
      isComplete: fromSetRemainingCards.length >= fromSet.setSize,
      // Buildings now float on the set if it becomes incomplete
      hasHouse: fromSet.hasHouse,
      hasHotel: fromSet.hasHotel,
      houseCard: fromSet.houseCard,
      hotelCard: fromSet.hotelCard,
    };
  }

  let effectiveToSetId = toSetId;
  if (!effectiveToSetId) {
    const matchingIncomplete = updatedSets.find(
      (s) => s.color === newColor && !s.isComplete,
    );
    if (matchingIncomplete) {
      effectiveToSetId = matchingIncomplete.setId;
    }
  }

  if (!effectiveToSetId) {
    throw new GameEngineError(
      "WILD_CARD_REQUIRES_EXISTING_PROPERTY",
      `Cannot move Wild Card to ${newColor.toUpperCase()} without an existing property card of that color on your table`,
    );
  }

  const toSetIndex = updatedSets.findIndex((s) => s.setId === effectiveToSetId);
  if (toSetIndex === -1) {
    throw new GameEngineError("PROPERTY_SET_NOT_FOUND", "Destination property set not found");
  }

  const toSet = updatedSets[toSetIndex]!;
  if (toSet.color !== newColor) {
    throw new GameEngineError(
      "INVALID_PROPERTY_COLOR",
      `Target set color mismatch: set is ${toSet.color}, wild changed to ${newColor}`,
    );
  }

  const newCards = [...toSet.cards, updatedCard];
  updatedSets[toSetIndex] = {
    ...toSet,
    cards: newCards,
    isComplete: newCards.length >= toSet.setSize,
  };

  const event: WildReorganizedEvent = {
    id: `event-${Date.now()}-reorg`,
    timestamp: Date.now(),
    type: "wild_reorganized",
    playerId,
    card: updatedCard,
    fromSetId,
    toSetId: effectiveToSetId!,
    newColor,
    message: `${player.name} moved wild card ${card.name} into ${newColor} set.`,
  };

  const nextState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        propertySets: updatedSets,
      },
    },
    history: [...state.history, event],
  };

  return { nextState, events: [event] };
}
