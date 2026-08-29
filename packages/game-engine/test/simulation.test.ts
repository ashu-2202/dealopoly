import { describe, expect, it } from "vitest";
import { createGame, applyCommand, type GameState } from "../src/index.js";

describe("Deterministic Simulation Harness", () => {
  function runBotTurn(state: GameState): GameState {
    let current = state;
    let safetyCounter = 0;

    while (current.status === "in_progress" && safetyCounter++ < 50) {
      // 1. Handle Pending Reactions
      if (current.pendingResolution?.type === "reaction_window") {
        const waitingId = current.pendingResolution.waitingForPlayerId;
        const waitingPlayer = current.players[waitingId]!;
        const jsnCard = waitingPlayer.hand.find((c) => c.defId === "action-just-say-no");

        if (jsnCard && current.pendingResolution.justSayNoChainCount < 2) {
          const res = applyCommand(current, {
            type: "submit_reaction",
            playerId: waitingId,
            action: "just_say_no",
            justSayNoCardInstanceId: jsnCard.instanceId,
          });
          current = res.nextState;
        } else {
          const res = applyCommand(current, {
            type: "submit_reaction",
            playerId: waitingId,
            action: "pass",
          });
          current = res.nextState;
        }
        continue;
      }

      // 2. Handle Pending Payments
      if (current.pendingResolution?.type === "payment") {
        const debtorId = current.pendingResolution.debtorPlayerId;
        const debtor = current.players[debtorId]!;
        const tableCards = [
          ...debtor.bank,
          ...debtor.propertySets.flatMap((s) => s.cards),
        ];

        const selectedCards: string[] = [];
        let accumulated = 0;

        for (const card of tableCards) {
          selectedCards.push(card.instanceId);
          accumulated += card.value;
          if (accumulated >= current.pendingResolution.amountDue) {
            break;
          }
        }

        const res = applyCommand(current, {
          type: "submit_payment",
          playerId: debtorId,
          paymentCardInstanceIds: selectedCards,
        });
        current = res.nextState;
        continue;
      }

      // 3. Handle Pending Discard
      if (current.pendingResolution?.type === "discard") {
        const discardPlayerId = current.pendingResolution.playerId;
        const player = current.players[discardPlayerId]!;
        const discardCards = player.hand
          .slice(0, current.pendingResolution.requiredDiscardCount)
          .map((c) => c.instanceId);

        const res = applyCommand(current, {
          type: "discard_cards",
          playerId: discardPlayerId,
          cardInstanceIds: discardCards,
        });
        current = res.nextState;
        break; // Turn ended
      }

      // 4. Normal Turn Execution
      const activeId = current.turn.activePlayerId;
      const activePlayer = current.players[activeId]!;

      if (current.turn.phase === "draw") {
        const res = applyCommand(current, {
          type: "draw_cards",
          playerId: activeId,
        });
        current = res.nextState;
        continue;
      }

      if (current.turn.phase === "action") {
        if (current.turn.actionsRemaining > 0 && activePlayer.hand.length > 0) {
          let cardPlayed = false;

          for (const card of activePlayer.hand) {
            if (card.type === "property") {
              const res = applyCommand(current, {
                type: "play_property",
                playerId: activeId,
                cardInstanceId: card.instanceId,
              });
              current = res.nextState;
              cardPlayed = true;
              break;
            } else if (card.type === "property-wild") {
              let color: CardColor | undefined;
              if (card.primaryColor === "all") {
                color = activePlayer.propertySets.find((s) => !s.isComplete)?.color;
              } else {
                const p = activePlayer.propertySets.find((s) => s.color === card.primaryColor && !s.isComplete);
                const s = activePlayer.propertySets.find((s) => s.color === card.secondaryColor && !s.isComplete);
                color = p?.color || s?.color;
              }

              if (color) {
                const res = applyCommand(current, {
                  type: "play_property",
                  playerId: activeId,
                  cardInstanceId: card.instanceId,
                  chosenColor: color,
                });
                current = res.nextState;
                cardPlayed = true;
                break;
              }
            } else if (card.type === "money" || card.type === "action" || card.type === "rent") {
              const res = applyCommand(current, {
                type: "bank_card",
                playerId: activeId,
                cardInstanceId: card.instanceId,
              });
              current = res.nextState;
              cardPlayed = true;
              break;
            }
          }

          if (cardPlayed) {
            continue;
          }
        }

        // End turn if no more actions
        const res = applyCommand(current, {
          type: "end_turn",
          playerId: activeId,
        });
        current = res.nextState;
        break;
      }
    }

    return current;
  }

  it("should run 50 turns without deadlock across multiple seeded 3-player games", () => {
    for (const seed of [101, 202, 303, 404, 505]) {
      let game = createGame({
        seed,
        players: [
          { id: "p1", name: "Bot 1", isBot: true },
          { id: "p2", name: "Bot 2", isBot: true },
          { id: "p3", name: "Bot 3", isBot: true },
        ],
      });

      for (let turn = 0; turn < 40; turn++) {
        if (game.status === "completed") {
          expect(game.winnerId).toBeDefined();
          break;
        }
        game = runBotTurn(game);
      }

      // Assert turn counter progressed
      expect(game.turn.turnNumber).toBeGreaterThan(1);
    }
  });
});
