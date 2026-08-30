import { describe, expect, it } from "vitest";
import { createGame, applyCommand, getMaskedView } from "../src/index.js";

describe("Game Setup and Initial Deal", () => {
  it("should create a 2-player game with 5 cards dealt to each player", () => {
    const game = createGame({
      seed: 12345,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    expect(game.status).toBe("in_progress");
    expect(game.playerOrder).toEqual(["p1", "p2"]);
    expect(game.players["p1"]?.hand.length).toBe(5);
    expect(game.players["p2"]?.hand.length).toBe(5);
    expect(game.deck.length).toBe(106 - 10);
    expect(game.turn.activePlayerId).toBe("p1");
    expect(game.turn.phase).toBe("draw");
    expect(game.turn.actionsRemaining).toBe(3);
  });

  it("should support up to 5 players", () => {
    const game = createGame({
      seed: 99999,
      players: [
        { id: "p1", name: "P1" },
        { id: "p2", name: "P2" },
        { id: "p3", name: "P3" },
        { id: "p4", name: "P4" },
        { id: "p5", name: "P5" },
      ],
    });

    expect(game.deck.length).toBe(106 - 25);
    expect(Object.keys(game.players).length).toBe(5);
  });

  it("should reject game creation with < 2 or > 5 players", () => {
    expect(() =>
      createGame({
        players: [{ id: "p1", name: "Solo" }],
      }),
    ).toThrow();

    expect(() =>
      createGame({
        players: [
          { id: "p1", name: "P1" },
          { id: "p2", name: "P2" },
          { id: "p3", name: "P3" },
          { id: "p4", name: "P4" },
          { id: "p5", name: "P5" },
          { id: "p6", name: "P6" },
        ],
      }),
    ).toThrow();
  });

  it("should produce masked player views that hide opponent hands", () => {
    const game = createGame({
      seed: 42,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    const aliceView = getMaskedView(game, "p1");
    expect(aliceView.players["p1"]?.hand).toBeDefined();
    expect(aliceView.players["p1"]?.hand?.length).toBe(5);

    expect(aliceView.players["p2"]?.hand).toBeUndefined();
    expect(aliceView.players["p2"]?.handCount).toBe(5);
    expect(aliceView.deckCount).toBe(game.deck.length);
  });

  it("should allow drawing cards at start of turn", () => {
    const game = createGame({
      seed: 42,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    const { nextState } = applyCommand(game, {
      type: "draw_cards",
      playerId: "p1",
    });

    expect(nextState.players["p1"]?.hand.length).toBe(7);
    expect(nextState.turn.phase).toBe("action");
    expect(nextState.deck.length).toBe(game.deck.length - 2);
  });

  it("should reshuffle discard pile into main deck when deck runs out and update deck count", () => {
    const game = createGame({
      seed: 42,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    // Create a mock state where deck is completely empty and discard pile has 10 cards
    const sampleDiscardCards = game.deck.slice(0, 10);
    const depletedState = {
      ...game,
      deck: [],
      discardPile: sampleDiscardCards,
    };

    const { nextState, events } = applyCommand(depletedState, {
      type: "draw_cards",
      playerId: "p1",
    });

    // Active player drew 2 cards (hand went from 5 to 7)
    expect(nextState.players["p1"]?.hand.length).toBe(7);

    // Discard pile is emptied
    expect(nextState.discardPile.length).toBe(0);

    // Main deck now has the remaining reshuffled cards: 10 - 2 = 8
    expect(nextState.deck.length).toBe(8);

    // Masked view reflects accurate deck count of 8 and empty discard pile
    const masked = getMaskedView(nextState, "p1");
    expect(masked.deckCount).toBe(8);
    expect(masked.discardPile.length).toBe(0);
    expect(masked.discardPileTop).toBeNull();

    // Event logs deck reshuffle
    expect(events[0]?.message).toContain("Deck reshuffled from 10 discard cards");
  });
});
