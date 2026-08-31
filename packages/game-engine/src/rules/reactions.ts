import type { GameState, PropertySet, CardInstance } from "../types/state.js";
import { GameEngineError } from "../types/errors.js";
import type {
  ReactionSubmittedEvent,
  ActionCancelledEvent,
  ActionResolvedEvent,
  GameEvent,
} from "../types/events.js";

export function handleReaction(
  state: GameState,
  playerId: string,
  action: "just_say_no" | "pass",
  justSayNoCardInstanceId?: string,
): { nextState: GameState; events: GameEvent[] } {
  if (!state.pendingResolution || state.pendingResolution.type !== "reaction_window") {
    throw new GameEngineError("MUST_RESOLVE_PENDING_ACTION", "No active reaction window");
  }

  const reaction = state.pendingResolution;
  if (playerId !== reaction.waitingForPlayerId) {
    throw new GameEngineError(
      "NOT_WAITING_FOR_YOUR_REACTION",
      `Waiting for player ${reaction.waitingForPlayerId}, not ${playerId}`,
    );
  }

  const player = state.players[playerId];
  if (!player) {
    throw new GameEngineError("NOT_YOUR_TURN", "Player not found");
  }

  const events: GameEvent[] = [];

  if (action === "just_say_no") {
    if (!justSayNoCardInstanceId) {
      throw new GameEngineError("CARD_NOT_IN_HAND", "Must provide card instance ID for Just Say No");
    }
    const cardIndex = player.hand.findIndex((c) => c.instanceId === justSayNoCardInstanceId);
    if (cardIndex === -1) {
      throw new GameEngineError("CARD_NOT_IN_HAND", "Just Say No card not in hand");
    }
    const jsnCard = player.hand[cardIndex]!;
    if (jsnCard.defId !== "action-just-say-no") {
      throw new GameEngineError("INVALID_CARD_TYPE", "Specified card is not a Just Say No card");
    }

    const updatedHand = player.hand.filter((_, idx) => idx !== cardIndex);
    const chainCount = reaction.justSayNoChainCount + 1;

    // Switch waiting player
    const nextWaitingPlayerId =
      playerId === reaction.targetPlayerId
        ? reaction.initiatorPlayerId
        : reaction.targetPlayerId;

    const jsnEvent: ReactionSubmittedEvent = {
      id: `event-${Date.now()}-jsn`,
      timestamp: Date.now(),
      type: "reaction_submitted",
      playerId,
      passed: false,
      justSayNoCard: jsnCard,
      message: `${player.name} played JUST SAY NO!`,
    };
    events.push(jsnEvent);

    const nextState: GameState = {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          ...player,
          hand: updatedHand,
        },
      },
      discardPile: [...state.discardPile, jsnCard],
      pendingResolution: {
        ...reaction,
        waitingForPlayerId: nextWaitingPlayerId,
        justSayNoChainCount: chainCount,
      },
      history: [...state.history, jsnEvent],
    };

    return { nextState, events };
  }

  // Action is "pass"
  const passEvent: ReactionSubmittedEvent = {
    id: `event-${Date.now()}-pass`,
    timestamp: Date.now(),
    type: "reaction_submitted",
    playerId,
    passed: true,
    message: `${player.name} passed on reaction.`,
  };
  events.push(passEvent);

  const isActionBlocked = reaction.justSayNoChainCount % 2 === 1;

  if (isActionBlocked) {
    // Action was blocked by Just Say No
    const cancelEvent: ActionCancelledEvent = {
      id: `event-${Date.now()}-cancelled`,
      timestamp: Date.now(),
      type: "action_cancelled",
      actionCard: reaction.actionCard,
      cancelledByPlayerId: reaction.targetPlayerId,
      message: `${reaction.actionCard.name} was successfully blocked by ${
        state.players[reaction.targetPlayerId]?.name
      }!`,
    };
    events.push(cancelEvent);

    // If multi-target exists, move to next target
    if (reaction.remainingTargets && reaction.remainingTargets.length > 0) {
      const nextTargetId = reaction.remainingTargets[0]!;
      const remaining = reaction.remainingTargets.slice(1);
      const nextTarget = state.players[nextTargetId];
      const targetHasJSN = nextTarget?.hand.some((c) => c.defId === "action-just-say-no");

      let nextPending: GameState["pendingResolution"] = null;
      if (targetHasJSN) {
        nextPending = {
          ...reaction,
          targetPlayerId: nextTargetId,
          waitingForPlayerId: nextTargetId,
          justSayNoChainCount: 0,
          remainingTargets: remaining,
        };
      } else {
        nextPending = {
          type: "payment",
          creditorPlayerId: reaction.initiatorPlayerId,
          debtorPlayerId: nextTargetId,
          amountDue: reaction.rentAmount ?? 2,
          remainingDebtors: remaining,
          reason: `${reaction.actionCard.name} payment`,
        };
      }

      return {
        nextState: {
          ...state,
          pendingResolution: nextPending,
          history: [...state.history, ...events],
        },
        events,
      };
    }

    return {
      nextState: {
        ...state,
        pendingResolution: null,
        history: [...state.history, ...events],
      },
      events,
    };
  }

  // Action is NOT blocked -> Execute original effect
  const resolvedEvent: ActionResolvedEvent = {
    id: `event-${Date.now()}-resolved`,
    timestamp: Date.now(),
    type: "action_resolved",
    actionCard: reaction.actionCard,
    message: `${reaction.actionCard.name} resolved successfully against ${
      state.players[reaction.targetPlayerId]?.name
    }.`,
  };
  events.push(resolvedEvent);

  const nextPendingState: GameState = {
    ...state,
    pendingResolution: null,
  };

  // Execute resolution by action type
  if (reaction.rentAmount) {
    // Rent / Debt Collector / Birthday -> proceed to payment
    nextPendingState.pendingResolution = {
      type: "payment",
      creditorPlayerId: reaction.initiatorPlayerId,
      debtorPlayerId: reaction.targetPlayerId,
      amountDue: reaction.rentAmount,
      remainingDebtors: reaction.remainingTargets ?? [],
      reason: `${reaction.actionCard.name} ($${reaction.rentAmount}M)`,
    };
  } else if (reaction.actionCard.defId === "action-deal-breaker") {
    // Steal full set
    const targetPlayer = state.players[reaction.targetPlayerId]!;
    const initiator = state.players[reaction.initiatorPlayerId]!;
    const targetSet = targetPlayer.propertySets.find((s) => s.setId === reaction.targetPropertySetId);

    if (targetSet) {
      const stolenCards = [...targetSet.cards];
      if (targetSet.houseCard) stolenCards.push(targetSet.houseCard);
      if (targetSet.hotelCard) stolenCards.push(targetSet.hotelCard);
      resolvedEvent.stolenCards = stolenCards;
      resolvedEvent.initiatorPlayerId = reaction.initiatorPlayerId;
      resolvedEvent.targetPlayerId = reaction.targetPlayerId;

      const remainingSets = targetPlayer.propertySets.filter((s) => s.setId !== reaction.targetPropertySetId);
      const newSets = [...initiator.propertySets, targetSet];

      nextPendingState.players = {
        ...nextPendingState.players,
        [reaction.targetPlayerId]: { ...targetPlayer, propertySets: remainingSets },
        [reaction.initiatorPlayerId]: { ...initiator, propertySets: newSets },
      };
    }
  } else if (reaction.actionCard.defId === "action-sly-deal") {
    // Steal single card
    const targetPlayer = state.players[reaction.targetPlayerId]!;
    const initiator = state.players[reaction.initiatorPlayerId]!;
    const setWithCard = targetPlayer.propertySets.find((s) =>
      s.cards.some((c) => c.instanceId === reaction.targetCardInstanceId) ||
      s.houseCard?.instanceId === reaction.targetCardInstanceId ||
      s.hotelCard?.instanceId === reaction.targetCardInstanceId
    );

    if (setWithCard) {
      let stolenCard: CardInstance;
      let setRemainingCards = setWithCard.cards;
      let keptHouse = setWithCard.houseCard;
      let keptHotel = setWithCard.hotelCard;
      
      if (setWithCard.houseCard?.instanceId === reaction.targetCardInstanceId) {
          stolenCard = setWithCard.houseCard!;
          keptHouse = undefined;
      } else if (setWithCard.hotelCard?.instanceId === reaction.targetCardInstanceId) {
          stolenCard = setWithCard.hotelCard!;
          keptHotel = undefined;
      } else {
          stolenCard = setWithCard.cards.find((c) => c.instanceId === reaction.targetCardInstanceId)!;
          setRemainingCards = setWithCard.cards.filter((c) => c.instanceId !== reaction.targetCardInstanceId);
      }

      resolvedEvent.stolenCards = [stolenCard];
      resolvedEvent.initiatorPlayerId = reaction.initiatorPlayerId;
      resolvedEvent.targetPlayerId = reaction.targetPlayerId;

      let opponentSets = [...targetPlayer.propertySets];
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

      const pSets = [...initiator.propertySets];
      if (stolenCard.type === "action") {
          initiator.bank.push(stolenCard);
      } else {
          const color = stolenCard.currentColor ?? stolenCard.primaryColor ?? "brown";
          const mIdx = pSets.findIndex((s) => s.color === color && !s.isComplete);
          
          if (mIdx !== -1) {
            pSets[mIdx] = {
              ...pSets[mIdx]!,
              cards: [...pSets[mIdx]!.cards, stolenCard],
              isComplete: pSets[mIdx]!.cards.length + 1 >= pSets[mIdx]!.setSize,
            };
          } else {
            pSets.push({
              setId: `set-${Date.now()}-${color}`,
              color,
              cards: [stolenCard],
              hasHouse: false,
              hasHotel: false,
              isComplete: false,
              setSize: stolenCard.setSize ?? 3,
              rentTiers: [1, 2, 3],
            });
          }
      }

      nextPendingState.players = {
        ...nextPendingState.players,
        [reaction.targetPlayerId]: { ...targetPlayer, propertySets: opponentSets },
        [reaction.initiatorPlayerId]: { ...initiator, propertySets: pSets },
      };
    }
  } else if (reaction.actionCard.defId === "action-force-deal") {
    // Swap cards
    const targetPlayer = state.players[reaction.targetPlayerId]!;
    const initiator = state.players[reaction.initiatorPlayerId]!;
    const offeredSet = initiator.propertySets.find((s) =>
      s.cards.some((c) => c.instanceId === reaction.swappedCardInstanceId) ||
      s.houseCard?.instanceId === reaction.swappedCardInstanceId ||
      s.hotelCard?.instanceId === reaction.swappedCardInstanceId
    );
    const targetSet = targetPlayer.propertySets.find((s) =>
      s.cards.some((c) => c.instanceId === reaction.targetCardInstanceId) ||
      s.houseCard?.instanceId === reaction.targetCardInstanceId ||
      s.hotelCard?.instanceId === reaction.targetCardInstanceId
    );

    if (offeredSet && targetSet) {
      let offeredCard: CardInstance;
      let offeredRemainingCards = offeredSet.cards;
      let keptOfferedHouse = offeredSet.houseCard;
      let keptOfferedHotel = offeredSet.hotelCard;
      
      if (offeredSet.houseCard?.instanceId === reaction.swappedCardInstanceId) {
          offeredCard = offeredSet.houseCard!;
          keptOfferedHouse = undefined;
      } else if (offeredSet.hotelCard?.instanceId === reaction.swappedCardInstanceId) {
          offeredCard = offeredSet.hotelCard!;
          keptOfferedHotel = undefined;
      } else {
          offeredCard = offeredSet.cards.find((c) => c.instanceId === reaction.swappedCardInstanceId)!;
          offeredRemainingCards = offeredSet.cards.filter((c) => c.instanceId !== reaction.swappedCardInstanceId);
      }

      let targetCard: CardInstance;
      let targetRemainingCards = targetSet.cards;
      let keptTargetHouse = targetSet.houseCard;
      let keptTargetHotel = targetSet.hotelCard;
      
      if (targetSet.houseCard?.instanceId === reaction.targetCardInstanceId) {
          targetCard = targetSet.houseCard!;
          keptTargetHouse = undefined;
      } else if (targetSet.hotelCard?.instanceId === reaction.targetCardInstanceId) {
          targetCard = targetSet.hotelCard!;
          keptTargetHotel = undefined;
      } else {
          targetCard = targetSet.cards.find((c) => c.instanceId === reaction.targetCardInstanceId)!;
          targetRemainingCards = targetSet.cards.filter((c) => c.instanceId !== reaction.targetCardInstanceId);
      }

      resolvedEvent.stolenCards = [targetCard];
      resolvedEvent.swappedCard = offeredCard;
      resolvedEvent.initiatorPlayerId = reaction.initiatorPlayerId;
      resolvedEvent.targetPlayerId = reaction.targetPlayerId;

      const newPlayerSets = initiator.propertySets
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

      const newOpponentSets = targetPlayer.propertySets
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

      if (targetCard.type === "action") {
          initiator.bank.push(targetCard);
      } else {
          const pColor = targetCard.currentColor ?? targetCard.primaryColor ?? "brown";
          const pIdx = newPlayerSets.findIndex((s) => s.color === pColor && !s.isComplete);
          if (pIdx !== -1) {
            newPlayerSets[pIdx] = {
              ...newPlayerSets[pIdx]!,
              cards: [...newPlayerSets[pIdx]!.cards, targetCard],
              isComplete: newPlayerSets[pIdx]!.cards.length + 1 >= newPlayerSets[pIdx]!.setSize,
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

      if (offeredCard.type === "action") {
          targetPlayer.bank.push(offeredCard);
      } else {
          const oColor = offeredCard.currentColor ?? offeredCard.primaryColor ?? "brown";
          const oIdx = newOpponentSets.findIndex((s) => s.color === oColor && !s.isComplete);
          if (oIdx !== -1) {
            newOpponentSets[oIdx] = {
              ...newOpponentSets[oIdx]!,
              cards: [...newOpponentSets[oIdx]!.cards, offeredCard],
              isComplete: newOpponentSets[oIdx]!.cards.length + 1 >= newOpponentSets[oIdx]!.setSize,
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

      nextPendingState.players = {
        ...nextPendingState.players,
        [reaction.initiatorPlayerId]: { ...initiator, propertySets: newPlayerSets },
        [reaction.targetPlayerId]: { ...targetPlayer, propertySets: newOpponentSets },
      };
    }
  }

  return {
    nextState: {
      ...nextPendingState,
      history: [...nextPendingState.history, ...events],
    },
    events,
  };
}
