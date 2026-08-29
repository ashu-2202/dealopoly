import type { GameState, PropertySet, CardInstance } from "../types/state.js";
import { GameEngineError } from "../types/errors.js";
import { drawCardsForActivePlayer } from "./draw.js";
import type {
  CardBankedEvent,
  ActionPlayedEvent,
  GameEvent,
} from "../types/events.js";

export function bankCard(
  state: GameState,
  playerId: string,
  cardInstanceId: string,
): { nextState: GameState; events: CardBankedEvent[] } {
  const player = state.players[playerId];
  if (!player) {
    throw new GameEngineError("NOT_YOUR_TURN", "Player not found");
  }

  const cardIndex = player.hand.findIndex((c) => c.instanceId === cardInstanceId);
  if (cardIndex === -1) {
    throw new GameEngineError("CARD_NOT_IN_HAND", "Card is not in player's hand");
  }

  const card = player.hand[cardIndex]!;
  if (card.value <= 0) {
    throw new GameEngineError(
      "CANNOT_BANK_CARD",
      `Cannot deposit ${card.name} into bank because it has no monetary value ($0M).`,
    );
  }

  const updatedHand = player.hand.filter((_, idx) => idx !== cardIndex);
  const updatedBank = [...player.bank, card];

  const event: CardBankedEvent = {
    id: `event-${Date.now()}-bank`,
    timestamp: Date.now(),
    type: "card_banked",
    playerId,
    card,
    message: `${player.name} deposited ${card.name} ($${card.value}M) into their bank.`,
  };

  const nextState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        hand: updatedHand,
        bank: updatedBank,
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

export function playActionCard(
  state: GameState,
  playerId: string,
  cardInstanceId: string,
  targetPlayerId?: string,
  targetSetId?: string,
  targetCardInstanceId?: string,
  offeredCardInstanceId?: string,
): { nextState: GameState; events: GameEvent[] } {
  const player = state.players[playerId];
  if (!player) {
    throw new GameEngineError("NOT_YOUR_TURN", "Player not found");
  }

  const cardIndex = player.hand.findIndex((c) => c.instanceId === cardInstanceId);
  if (cardIndex === -1) {
    throw new GameEngineError("CARD_NOT_IN_HAND", "Card is not in player's hand");
  }

  const actionCard = player.hand[cardIndex]!;
  if (actionCard.type !== "action") {
    throw new GameEngineError("INVALID_CARD_TYPE", "Specified card is not an action card");
  }

  const updatedHand = player.hand.filter((_, idx) => idx !== cardIndex);
  const events: GameEvent[] = [];

  const baseEvent: ActionPlayedEvent = {
    id: `event-${Date.now()}-action`,
    timestamp: Date.now(),
    type: "action_played",
    playerId,
    actionCard,
    targetPlayerId,
    targetSetId,
    targetCardId: targetCardInstanceId,
    message: `${player.name} played action ${actionCard.name}.`,
  };
  events.push(baseEvent);

  let nextState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        hand: updatedHand,
      },
    },
    discardPile: [...state.discardPile, actionCard],
    turn: {
      ...state.turn,
      actionsRemaining: state.turn.actionsRemaining - 1,
      cardsPlayedThisTurn: state.turn.cardsPlayedThisTurn + 1,
    },
  };

  // Dispatch according to action card definition
  switch (actionCard.defId) {
    // ----------------------------------------------------
    // 1. PASS GO
    // ----------------------------------------------------
    case "action-pass-go": {
      const drawResult = drawCardsForActivePlayer(nextState, 2);
      nextState = drawResult.nextState;
      events.push(...drawResult.events);
      break;
    }

    // ----------------------------------------------------
    // 2. HOUSE
    // ----------------------------------------------------
    case "action-house": {
      let resolvedSetId = targetSetId;
      if (!resolvedSetId) {
        const eligibleSets = player.propertySets.filter(
          (s) => s.isComplete && !s.hasHouse && s.color !== "railroad" && s.color !== "utility",
        );
        if (eligibleSets.length === 1) {
          resolvedSetId = eligibleSets[0]?.setId;
        } else if (eligibleSets.length === 0) {
          throw new GameEngineError(
            "HOUSE_REQUIRES_FULL_SET",
            "House can only be added to a complete property set (excluding Railroads and Utilities)",
          );
        } else {
          throw new GameEngineError(
            "INVALID_ACTION_TARGET",
            "Please specify which complete property set to add the House to",
          );
        }
      }

      const setIndex = player.propertySets.findIndex((s) => s.setId === resolvedSetId);
      if (setIndex === -1) {
        throw new GameEngineError("PROPERTY_SET_NOT_FOUND", "Target property set not found in player's properties");
      }
      const targetSet = player.propertySets[setIndex]!;
      if (targetSet.color === "railroad" || targetSet.color === "utility") {
        throw new GameEngineError("CANNOT_ADD_BUILDING_TO_SPECIAL_SET", "Cannot add House to Railroad or Utility sets");
      }
      if (!targetSet.isComplete) {
        throw new GameEngineError("HOUSE_REQUIRES_FULL_SET", "House can only be added to a complete property set");
      }
      if (targetSet.hasHouse) {
        throw new GameEngineError("HOUSE_REQUIRES_FULL_SET", "Property set already has a House");
      }

      const updatedSet: PropertySet = { ...targetSet, hasHouse: true, houseCard: actionCard };
      const newSets = [...player.propertySets];
      newSets[setIndex] = updatedSet;

      // Note: House card stays on the set instead of going to discard
      const cleanedDiscards = nextState.discardPile.filter((c) => c.instanceId !== actionCard.instanceId);

      nextState = {
        ...nextState,
        discardPile: cleanedDiscards,
        players: {
          ...nextState.players,
          [playerId]: {
            ...player,
            hand: updatedHand,
            propertySets: newSets,
          },
        },
      };
      break;
    }

    // ----------------------------------------------------
    // 3. HOTEL
    // ----------------------------------------------------
    case "action-hotel": {
      let resolvedSetId = targetSetId;
      if (!resolvedSetId) {
        const eligibleSets = player.propertySets.filter(
          (s) => s.isComplete && s.hasHouse && !s.hasHotel,
        );
        if (eligibleSets.length === 1) {
          resolvedSetId = eligibleSets[0]?.setId;
        } else if (eligibleSets.length === 0) {
          throw new GameEngineError(
            "HOTEL_REQUIRES_HOUSE",
            "Hotel requires a complete property set with an existing House on it first",
          );
        } else {
          throw new GameEngineError(
            "INVALID_ACTION_TARGET",
            "Please specify which complete property set with a House to add the Hotel to",
          );
        }
      }

      const setIndex = player.propertySets.findIndex((s) => s.setId === resolvedSetId);
      if (setIndex === -1) {
        throw new GameEngineError("PROPERTY_SET_NOT_FOUND", "Target property set not found");
      }
      const targetSet = player.propertySets[setIndex]!;
      if (!targetSet.hasHouse) {
        throw new GameEngineError("HOTEL_REQUIRES_HOUSE", "Hotel requires a House on the complete property set first");
      }
      if (targetSet.hasHotel) {
        throw new GameEngineError("HOTEL_REQUIRES_HOUSE", "Property set already has a Hotel");
      }

      const updatedSet: PropertySet = { ...targetSet, hasHotel: true, hotelCard: actionCard };
      const newSets = [...player.propertySets];
      newSets[setIndex] = updatedSet;

      const cleanedDiscards = nextState.discardPile.filter((c) => c.instanceId !== actionCard.instanceId);

      nextState = {
        ...nextState,
        discardPile: cleanedDiscards,
        players: {
          ...nextState.players,
          [playerId]: {
            ...player,
            hand: updatedHand,
            propertySets: newSets,
          },
        },
      };
      break;
    }

    // ----------------------------------------------------
    // 4. DEAL BREAKER (Steal full set)
    // ----------------------------------------------------
    case "action-deal-breaker": {
      if (!targetPlayerId || !targetSetId) {
        throw new GameEngineError("INVALID_ACTION_TARGET", "Deal Breaker requires target player and target property set");
      }
      if (targetPlayerId === playerId) {
        throw new GameEngineError("CANNOT_TARGET_SELF", "Cannot target yourself");
      }
      const targetOpponent = state.players[targetPlayerId];
      if (!targetOpponent) {
        throw new GameEngineError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
      }
      const targetSet = targetOpponent.propertySets.find((s) => s.setId === targetSetId);
      if (!targetSet) {
        throw new GameEngineError("PROPERTY_SET_NOT_FOUND", "Target property set not found");
      }
      if (!targetSet.isComplete) {
        throw new GameEngineError("SET_IS_NOT_COMPLETE", "Deal Breaker can only steal complete property sets");
      }

      // Check if target has Just Say No
      const hasJSN = targetOpponent.hand.some((c) => c.defId === "action-just-say-no");
      if (hasJSN) {
        nextState.pendingResolution = {
          type: "reaction_window",
          initiatorPlayerId: playerId,
          targetPlayerId,
          actionCard,
          targetPropertySetId: targetSetId,
          waitingForPlayerId: targetPlayerId,
          justSayNoChainCount: 0,
          isCancelled: false,
        };
      } else {
        // Transfer set immediately
        const opponentRemainingSets = targetOpponent.propertySets.filter((s) => s.setId !== targetSetId);
        const playerNewSets = [...nextState.players[playerId]!.propertySets, targetSet];

        nextState.players = {
          ...nextState.players,
          [targetPlayerId]: {
            ...targetOpponent,
            propertySets: opponentRemainingSets,
          },
          [playerId]: {
            ...nextState.players[playerId]!,
            propertySets: playerNewSets,
          },
        };
      }
      break;
    }

    // ----------------------------------------------------
    // 5. SLY DEAL (Steal single property)
    // ----------------------------------------------------
    case "action-sly-deal": {
      if (!targetPlayerId || !targetCardInstanceId) {
        throw new GameEngineError("INVALID_ACTION_TARGET", "Sly Deal requires target player and target card");
      }
      if (targetPlayerId === playerId) {
        throw new GameEngineError("CANNOT_TARGET_SELF", "Cannot target yourself");
      }
      const targetOpponent = state.players[targetPlayerId];
      if (!targetOpponent) {
        throw new GameEngineError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
      }

      // Find set containing target card
      const setWithCard = targetOpponent.propertySets.find((s) =>
        s.cards.some((c) => c.instanceId === targetCardInstanceId) ||
        s.houseCard?.instanceId === targetCardInstanceId ||
        s.hotelCard?.instanceId === targetCardInstanceId
      );
      if (!setWithCard) {
        throw new GameEngineError("TARGET_CARD_NOT_FOUND", "Target property card not found on opponent's table");
      }
      const isTargetBuilding = setWithCard.houseCard?.instanceId === targetCardInstanceId || setWithCard.hotelCard?.instanceId === targetCardInstanceId;
      if (setWithCard.isComplete && !isTargetBuilding) {
        throw new GameEngineError("SET_IS_ALREADY_COMPLETE", "Sly Deal cannot steal property cards from a complete property set");
      }
      if (setWithCard.isComplete && isTargetBuilding) {
        throw new GameEngineError("BUILDING_ON_COMPLETE_SET", "Sly Deal cannot steal a house or hotel that is part of a complete property set");
      }

      const hasJSN = targetOpponent.hand.some((c) => c.defId === "action-just-say-no");
      if (hasJSN) {
        nextState.pendingResolution = {
          type: "reaction_window",
          initiatorPlayerId: playerId,
          targetPlayerId,
          actionCard,
          targetCardInstanceId,
          waitingForPlayerId: targetPlayerId,
          justSayNoChainCount: 0,
          isCancelled: false,
        };
      } else {
        // Transfer single card
        let stolenCard: CardInstance;
        let setRemainingCards = setWithCard.cards;
        let keptHouse = setWithCard.houseCard;
        let keptHotel = setWithCard.hotelCard;
        
        if (setWithCard.houseCard?.instanceId === targetCardInstanceId) {
            stolenCard = setWithCard.houseCard!;
            keptHouse = undefined;
        } else if (setWithCard.hotelCard?.instanceId === targetCardInstanceId) {
            stolenCard = setWithCard.hotelCard!;
            keptHotel = undefined;
        } else {
            stolenCard = setWithCard.cards.find((c) => c.instanceId === targetCardInstanceId)!;
            setRemainingCards = setWithCard.cards.filter((c) => c.instanceId !== targetCardInstanceId);
        }

        let opponentSets = [...targetOpponent.propertySets];
        if (setRemainingCards.length === 0 && !keptHouse && !keptHotel) {
          opponentSets = opponentSets.filter((s) => s.setId !== setWithCard.setId);
        } else {
          const idx = opponentSets.findIndex((s) => s.setId === setWithCard.setId);
          opponentSets[idx] = {
            ...setWithCard,
            cards: setRemainingCards,
            isComplete: setRemainingCards.length >= setWithCard.setSize,
            hasHouse: !!keptHouse,
            hasHotel: !!keptHotel,
            houseCard: keptHouse,
            hotelCard: keptHotel,
          };
        }

        // Add to player's properties
        const color = stolenCard.currentColor ?? stolenCard.primaryColor ?? "brown";
        const matchingSetIndex = nextState.players[playerId]!.propertySets.findIndex(
          (s) => s.color === color && !s.isComplete,
        );

        const playerSets = [...nextState.players[playerId]!.propertySets];
        if (matchingSetIndex !== -1) {
          const mSet = playerSets[matchingSetIndex]!;
          const newCards = [...mSet.cards, stolenCard];
          playerSets[matchingSetIndex] = {
            ...mSet,
            cards: newCards,
            isComplete: newCards.length >= mSet.setSize,
          };
        } else {
          // New set
          const newSet: PropertySet = {
            setId: `set-${Date.now()}-${color}`,
            color,
            cards: [stolenCard],
            hasHouse: false,
            hasHotel: false,
            isComplete: false,
            setSize: stolenCard.setSize ?? 3,
            rentTiers: [1, 2, 3],
          };
          playerSets.push(newSet);
        }

        nextState.players = {
          ...nextState.players,
          [targetPlayerId]: {
            ...nextState.players[targetPlayerId]!,
            propertySets: opponentSets,
          },
          [playerId]: {
            ...nextState.players[playerId]!,
            propertySets: playerSets,
          },
        };
      }
      break;
    }

    // ----------------------------------------------------
    // 6. FORCE DEAL (Swap properties)
    // ----------------------------------------------------
    case "action-forced-deal":
    case "action-force-deal": {
      if (!targetPlayerId || !targetCardInstanceId || !offeredCardInstanceId) {
        throw new GameEngineError(
          "INVALID_ACTION_TARGET",
          "Force Deal requires target player, target card, and offered card",
        );
      }
      if (targetPlayerId === playerId) {
        throw new GameEngineError("CANNOT_TARGET_SELF", "Cannot target yourself");
      }
      const targetOpponent = state.players[targetPlayerId];
      if (!targetOpponent) {
        throw new GameEngineError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
      }

      // Check offered card
      const offeredSet = player.propertySets.find((s) =>
        s.cards.some((c) => c.instanceId === offeredCardInstanceId) ||
        s.houseCard?.instanceId === offeredCardInstanceId ||
        s.hotelCard?.instanceId === offeredCardInstanceId
      );
      if (!offeredSet) {
        throw new GameEngineError("OFFERED_CARD_NOT_FOUND", "Offered property card not found in your properties");
      }
      const isOfferedBuilding = offeredSet.houseCard?.instanceId === offeredCardInstanceId || offeredSet.hotelCard?.instanceId === offeredCardInstanceId;
      if (offeredSet.isComplete && !isOfferedBuilding) {
        throw new GameEngineError("SET_IS_ALREADY_COMPLETE", "Cannot trade property cards from a complete property set");
      }
      if (offeredSet.isComplete && isOfferedBuilding) {
        throw new GameEngineError("BUILDING_ON_COMPLETE_SET", "Cannot trade a house or hotel that is part of a complete property set");
      }

      // Check target card
      const targetSet = targetOpponent.propertySets.find((s) =>
        s.cards.some((c) => c.instanceId === targetCardInstanceId) ||
        s.houseCard?.instanceId === targetCardInstanceId ||
        s.hotelCard?.instanceId === targetCardInstanceId
      );
      if (!targetSet) {
        throw new GameEngineError("TARGET_CARD_NOT_FOUND", "Target property card not found on opponent's table");
      }
      const isTargetBuilding = targetSet.houseCard?.instanceId === targetCardInstanceId || targetSet.hotelCard?.instanceId === targetCardInstanceId;
      if (targetSet.isComplete && !isTargetBuilding) {
        throw new GameEngineError("SET_IS_ALREADY_COMPLETE", "Cannot trade for property cards from a complete property set");
      }
      if (targetSet.isComplete && isTargetBuilding) {
        throw new GameEngineError("BUILDING_ON_COMPLETE_SET", "Cannot trade for a house or hotel that is part of a complete property set");
      }

      const hasJSN = targetOpponent.hand.some((c) => c.defId === "action-just-say-no");
      if (hasJSN) {
        nextState.pendingResolution = {
          type: "reaction_window",
          initiatorPlayerId: playerId,
          targetPlayerId,
          actionCard,
          targetCardInstanceId,
          swappedCardInstanceId: offeredCardInstanceId,
          waitingForPlayerId: targetPlayerId,
          justSayNoChainCount: 0,
          isCancelled: false,
        };
      } else {
        // Perform Swap
        let offeredCard: CardInstance;
        let offeredRemainingCards = offeredSet.cards;
        let keptOfferedHouse = offeredSet.houseCard;
        let keptOfferedHotel = offeredSet.hotelCard;
        
        if (offeredSet.houseCard?.instanceId === offeredCardInstanceId) {
            offeredCard = offeredSet.houseCard!;
            keptOfferedHouse = undefined;
        } else if (offeredSet.hotelCard?.instanceId === offeredCardInstanceId) {
            offeredCard = offeredSet.hotelCard!;
            keptOfferedHotel = undefined;
        } else {
            offeredCard = offeredSet.cards.find((c) => c.instanceId === offeredCardInstanceId)!;
            offeredRemainingCards = offeredSet.cards.filter((c) => c.instanceId !== offeredCardInstanceId);
        }

        let targetCard: CardInstance;
        let targetRemainingCards = targetSet.cards;
        let keptTargetHouse = targetSet.houseCard;
        let keptTargetHotel = targetSet.hotelCard;
        
        if (targetSet.houseCard?.instanceId === targetCardInstanceId) {
            targetCard = targetSet.houseCard!;
            keptTargetHouse = undefined;
        } else if (targetSet.hotelCard?.instanceId === targetCardInstanceId) {
            targetCard = targetSet.hotelCard!;
            keptTargetHotel = undefined;
        } else {
            targetCard = targetSet.cards.find((c) => c.instanceId === targetCardInstanceId)!;
            targetRemainingCards = targetSet.cards.filter((c) => c.instanceId !== targetCardInstanceId);
        }

        // Replace in sets
        const newPlayerSets = player.propertySets
          .map((s) => {
            if (s.setId === offeredSet.setId) {
              if (offeredRemainingCards.length === 0 && !keptOfferedHouse && !keptOfferedHotel) return null;
              return { 
                  ...s, 
                  cards: offeredRemainingCards, 
                  isComplete: offeredRemainingCards.length >= s.setSize,
                  hasHouse: !!keptOfferedHouse,
                  hasHotel: !!keptOfferedHotel,
                  houseCard: keptOfferedHouse,
                  hotelCard: keptOfferedHotel,
              };
            }
            return s;
          })
          .filter(Boolean) as PropertySet[];

        const newOpponentSets = targetOpponent.propertySets
          .map((s) => {
            if (s.setId === targetSet.setId) {
              if (targetRemainingCards.length === 0 && !keptTargetHouse && !keptTargetHotel) return null;
              return { 
                  ...s, 
                  cards: targetRemainingCards, 
                  isComplete: targetRemainingCards.length >= s.setSize,
                  hasHouse: !!keptTargetHouse,
                  hasHotel: !!keptTargetHotel,
                  houseCard: keptTargetHouse,
                  hotelCard: keptTargetHotel,
              };
            }
            return s;
          })
          .filter(Boolean) as PropertySet[];

        // Place target card in player sets
        if (targetCard.type === "action") {
            nextState.players[playerId]!.bank.push(targetCard);
        } else {
            const pColor = targetCard.currentColor ?? targetCard.primaryColor ?? "brown";
            const pMatchIdx = newPlayerSets.findIndex((s) => s.color === pColor && !s.isComplete);
            if (pMatchIdx !== -1) {
              newPlayerSets[pMatchIdx] = {
                ...newPlayerSets[pMatchIdx]!,
                cards: [...newPlayerSets[pMatchIdx]!.cards, targetCard],
                isComplete: newPlayerSets[pMatchIdx]!.cards.length + 1 >= newPlayerSets[pMatchIdx]!.setSize,
              };
            } else {
              newPlayerSets.push({
                setId: `set-${Date.now()}-${pColor}`,
                color: pColor,
                cards: [targetCard],
                hasHouse: false,
                hasHotel: false,
                isComplete: false,
                setSize: targetCard.setSize ?? 3,
                rentTiers: [1, 2, 3],
              });
            }
        }

        // Place offered card in opponent sets
        if (offeredCard.type === "action") {
            nextState.players[targetPlayerId]!.bank.push(offeredCard);
        } else {
            const oColor = offeredCard.currentColor ?? offeredCard.primaryColor ?? "brown";
            const oMatchIdx = newOpponentSets.findIndex((s) => s.color === oColor && !s.isComplete);
            if (oMatchIdx !== -1) {
              newOpponentSets[oMatchIdx] = {
                ...newOpponentSets[oMatchIdx]!,
                cards: [...newOpponentSets[oMatchIdx]!.cards, offeredCard],
                isComplete: newOpponentSets[oMatchIdx]!.cards.length + 1 >= newOpponentSets[oMatchIdx]!.setSize,
              };
            } else {
              newOpponentSets.push({
                setId: `set-${Date.now()}-${oColor}`,
                color: oColor,
                cards: [offeredCard],
                hasHouse: false,
                hasHotel: false,
                isComplete: false,
                setSize: offeredCard.setSize ?? 3,
                rentTiers: [1, 2, 3],
              });
            }
        }

        nextState.players = {
          ...nextState.players,
          [playerId]: { ...nextState.players[playerId]!, propertySets: newPlayerSets },
          [targetPlayerId]: { ...nextState.players[targetPlayerId]!, propertySets: newOpponentSets },
        };
      }
      break;
    }

    // ----------------------------------------------------
    // 7. DEBT COLLECTOR ($5M from 1 player)
    // ----------------------------------------------------
    case "action-debt-collector": {
      if (!targetPlayerId) {
        throw new GameEngineError("INVALID_ACTION_TARGET", "Debt Collector requires a target opponent");
      }
      if (targetPlayerId === playerId) {
        throw new GameEngineError("CANNOT_TARGET_SELF", "Cannot target yourself");
      }
      const targetOpponent = state.players[targetPlayerId];
      if (!targetOpponent) {
        throw new GameEngineError("TARGET_PLAYER_NOT_FOUND", "Target player not found");
      }

      const hasJSN = targetOpponent.hand.some((c) => c.defId === "action-just-say-no");
      if (hasJSN) {
        nextState.pendingResolution = {
          type: "reaction_window",
          initiatorPlayerId: playerId,
          targetPlayerId,
          actionCard,
          rentAmount: 5,
          waitingForPlayerId: targetPlayerId,
          justSayNoChainCount: 0,
          isCancelled: false,
        };
      } else {
        nextState.pendingResolution = {
          type: "payment",
          creditorPlayerId: playerId,
          debtorPlayerId: targetPlayerId,
          amountDue: 5,
          remainingDebtors: [],
          reason: "Debt Collector ($5M)",
        };
      }
      break;
    }

    // ----------------------------------------------------
    // 8. IT'S MY BIRTHDAY ($2M from all players)
    // ----------------------------------------------------
    case "action-its-my-birthday": {
      const opponents = state.playerOrder.filter((id) => id !== playerId);
      if (opponents.length === 0) break;

      const firstOpponent = opponents[0]!;
      const remaining = opponents.slice(1);

      const targetOpponent = state.players[firstOpponent];
      const hasJSN = targetOpponent?.hand.some((c) => c.defId === "action-just-say-no");

      if (hasJSN) {
        nextState.pendingResolution = {
          type: "reaction_window",
          initiatorPlayerId: playerId,
          targetPlayerId: firstOpponent,
          actionCard,
          rentAmount: 2,
          waitingForPlayerId: firstOpponent,
          justSayNoChainCount: 0,
          isCancelled: false,
          remainingTargets: remaining,
        };
      } else {
        nextState.pendingResolution = {
          type: "payment",
          creditorPlayerId: playerId,
          debtorPlayerId: firstOpponent,
          amountDue: 2,
          remainingDebtors: remaining,
          reason: "It's My Birthday ($2M)",
        };
      }
      break;
    }

    default:
      throw new GameEngineError("INVALID_CARD_TYPE", `Unknown action card effect: ${actionCard.defId}`);
  }

  nextState.history = [...nextState.history, ...events];
  return { nextState, events };
}
