import type { CardColor } from "@dealopoly/shared";
import type { GameState } from "./types/state.js";
import type { GameCommand } from "./types/commands.js";

export class BotController {
  /**
   * Evaluates the next legal move for a bot player given the current game state
   */
  public static getNextBotAction(state: GameState, botPlayerId: string): GameCommand | null {
    const bot = state.players[botPlayerId];
    if (!bot) return null;

    // 1. Handle Pending Reaction Window
    if (state.pendingResolution?.type === "reaction_window") {
      if (state.pendingResolution.waitingForPlayerId === botPlayerId) {
        const jsnCard = bot.hand.find((c) => c.defId === "action-just-say-no");
        if (jsnCard && state.pendingResolution.justSayNoChainCount < 2) {
          return {
            type: "submit_reaction",
            playerId: botPlayerId,
            action: "just_say_no",
            justSayNoCardInstanceId: jsnCard.instanceId,
          };
        }
        return {
          type: "submit_reaction",
          playerId: botPlayerId,
          action: "pass",
        };
      }
      return null;
    }

    // 2. Handle Pending Payment
    if (state.pendingResolution?.type === "payment") {
      if (state.pendingResolution.debtorPlayerId === botPlayerId) {
        const tableCards = [
          ...bot.bank,
          ...bot.propertySets.flatMap((s) => s.cards),
        ];

        const selectedCards: string[] = [];
        let total = 0;
        for (const card of tableCards) {
          selectedCards.push(card.instanceId);
          total += card.value;
          if (total >= state.pendingResolution.amountDue) {
            break;
          }
        }

        return {
          type: "submit_payment",
          playerId: botPlayerId,
          paymentCardInstanceIds: selectedCards,
        };
      }
      return null;
    }

    // 3. Handle Pending Discard
    if (state.pendingResolution?.type === "discard") {
      if (state.pendingResolution.playerId === botPlayerId) {
        const discardCount = state.pendingResolution.requiredDiscardCount;
        const discardIds = bot.hand.slice(0, discardCount).map((c) => c.instanceId);
        return {
          type: "discard_cards",
          playerId: botPlayerId,
          cardInstanceIds: discardIds,
        };
      }
      return null;
    }

    // 4. Normal Turn
    if (state.turn.activePlayerId !== botPlayerId) {
      return null;
    }

    if (state.turn.phase === "draw") {
      return {
        type: "draw_cards",
        playerId: botPlayerId,
      };
    }

    if (state.turn.phase === "action") {
      if (state.turn.actionsRemaining > 0 && bot.hand.length > 0) {
        // Priority A: Play regular Property card
        const propCard = bot.hand.find((c) => c.type === "property");
        if (propCard) {
          const matchingSet = bot.propertySets.find(
            (s) => s.color === propCard.primaryColor && !s.isComplete,
          );
          return {
            type: "play_property",
            playerId: botPlayerId,
            cardInstanceId: propCard.instanceId,
            targetSetId: matchingSet?.setId,
          };
        }

        // Priority B: Play Wild Property card (only if an eligible incomplete set exists on the table)
        const wildCard = bot.hand.find((c) => c.type === "property-wild");
        if (wildCard) {
          let chosenColor: CardColor | undefined;
          if (wildCard.primaryColor === "all") {
            const incompleteSet = bot.propertySets.find((s) => !s.isComplete);
            chosenColor = incompleteSet?.color;
          } else {
            const incompletePrimary = bot.propertySets.find(
              (s) => s.color === wildCard.primaryColor && !s.isComplete,
            );
            const incompleteSecondary = bot.propertySets.find(
              (s) => s.color === wildCard.secondaryColor && !s.isComplete,
            );
            chosenColor = incompletePrimary?.color || incompleteSecondary?.color;
          }

          if (chosenColor) {
            return {
              type: "play_property",
              playerId: botPlayerId,
              cardInstanceId: wildCard.instanceId,
              chosenColor,
            };
          }
        }

        // Priority C: Play Pass Go
        const passGo = bot.hand.find((c) => c.defId === "action-pass-go");
        if (passGo) {
          return {
            type: "play_action",
            playerId: botPlayerId,
            cardInstanceId: passGo.instanceId,
          };
        }

        // Priority D: Bank Money
        const moneyCard = bot.hand.find((c) => c.type === "money");
        if (moneyCard) {
          return {
            type: "bank_card",
            playerId: botPlayerId,
            cardInstanceId: moneyCard.instanceId,
          };
        }

        // Priority E: Play Rent if bot owns matching property
        const rentCard = bot.hand.find((c) => {
          if (c.type !== "rent") return false;
          if (c.primaryColor === "all") return bot.propertySets.length > 0;
          return bot.propertySets.some((s) => s.color === c.primaryColor || s.color === c.secondaryColor);
        });
        if (rentCard) {
          let chosenColor: CardColor = "dark-blue";
          if (rentCard.primaryColor === "all") {
            chosenColor = bot.propertySets[0]!.color;
          } else {
            const hasPrimary = bot.propertySets.some((s) => s.color === rentCard.primaryColor);
            chosenColor = (hasPrimary ? rentCard.primaryColor : rentCard.secondaryColor) as CardColor;
          }

          const doubleRentCard = bot.hand.find((c) => c.defId === "action-double-the-rent");
          const useDoubleRent = doubleRentCard && state.turn.actionsRemaining >= 2;

          const opponents = state.playerOrder.filter((id) => id !== botPlayerId);
          const targetPlayerId = rentCard.primaryColor === "all" ? opponents[0] : undefined;

          return {
            type: "play_rent",
            playerId: botPlayerId,
            rentCardInstanceId: rentCard.instanceId,
            chosenColor,
            targetPlayerId,
            doubleRentCardInstanceId: useDoubleRent ? doubleRentCard.instanceId : undefined,
          };
        }

        // Priority F: Bank other cards
        const bankableCard = bot.hand.find((c) => c.type === "action" || c.type === "rent");
        if (bankableCard) {
          return {
            type: "bank_card",
            playerId: botPlayerId,
            cardInstanceId: bankableCard.instanceId,
          };
        }
      }

      // End turn
      return {
        type: "end_turn",
        playerId: botPlayerId,
      };
    }

    return null;
  }
}
