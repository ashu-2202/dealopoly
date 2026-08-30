import { describe, it, expect } from "vitest";
import {
  createLeastCountDeck,
  validateDiscardCombination,
  calculateHandScore,
  createLeastCountGame,
  handleDiscardCards,
  handleDrawCard,
  handleDeclareShow,
  LeastCountBotController,
  getGameEngine,
  type LeastCountCard,
} from "../src/index.js";

describe("Least Count (Yaniv) Game Engine", () => {
  describe("Deck & Card Rules", () => {
    it("creates a standard 54-card deck with 2 Jokers and accurate point values", () => {
      const deck = createLeastCountDeck(true);
      expect(deck.length).toBe(54);

      const aces = deck.filter((c) => c.rank === "A");
      expect(aces.length).toBe(4);
      expect(aces.every((c) => c.points === 1)).toBe(true);

      const faceCards = deck.filter((c) => ["J", "Q", "K"].includes(c.rank));
      expect(faceCards.length).toBe(12);
      expect(faceCards.every((c) => c.points === 10)).toBe(true);

      const jokers = deck.filter((c) => c.isJoker);
      expect(jokers.length).toBe(2);
      expect(jokers.every((c) => c.points === 0)).toBe(true);
    });

    it("calculates hand score correctly", () => {
      const hand: LeastCountCard[] = [
        { instanceId: "1", suit: "spades", rank: "A", points: 1, rankValue: 1, isJoker: false },
        { instanceId: "2", suit: "hearts", rank: "7", points: 7, rankValue: 7, isJoker: false },
        { instanceId: "3", suit: "diamonds", rank: "K", points: 10, rankValue: 13, isJoker: false },
        { instanceId: "4", suit: "clubs", rank: "JOKER", points: 0, rankValue: 0, isJoker: true },
      ];
      expect(calculateHandScore(hand)).toBe(18); // 1 + 7 + 10 + 0
    });
  });

  describe("Discard Combination Validation", () => {
    it("allows single card discard", () => {
      const card: LeastCountCard = { instanceId: "1", suit: "spades", rank: "K", points: 10, rankValue: 13, isJoker: false };
      expect(validateDiscardCombination([card]).valid).toBe(true);
    });

    it("allows sets of 2 or more of the same rank", () => {
      const pair: LeastCountCard[] = [
        { instanceId: "1", suit: "spades", rank: "8", points: 8, rankValue: 8, isJoker: false },
        { instanceId: "2", suit: "diamonds", rank: "8", points: 8, rankValue: 8, isJoker: false },
      ];
      expect(validateDiscardCombination(pair).valid).toBe(true);

      const triplet: LeastCountCard[] = [
        ...pair,
        { instanceId: "3", suit: "hearts", rank: "8", points: 8, rankValue: 8, isJoker: false },
      ];
      expect(validateDiscardCombination(triplet).valid).toBe(true);
    });

    it("allows 3+ consecutive cards in the same suit (runs)", () => {
      const run: LeastCountCard[] = [
        { instanceId: "1", suit: "hearts", rank: "4", points: 4, rankValue: 4, isJoker: false },
        { instanceId: "2", suit: "hearts", rank: "5", points: 5, rankValue: 5, isJoker: false },
        { instanceId: "3", suit: "hearts", rank: "6", points: 6, rankValue: 6, isJoker: false },
      ];
      expect(validateDiscardCombination(run).valid).toBe(true);
    });

    it("rejects invalid combinations", () => {
      const invalidCombo: LeastCountCard[] = [
        { instanceId: "1", suit: "hearts", rank: "4", points: 4, rankValue: 4, isJoker: false },
        { instanceId: "2", suit: "spades", rank: "5", points: 5, rankValue: 5, isJoker: false },
      ];
      expect(validateDiscardCombination(invalidCombo).valid).toBe(false);
    });
  });

  describe("Game Flow: Discard & Draw", () => {
    it("initializes a game with 5 cards per player and an open discard pile", () => {
      const state = createLeastCountGame({
        players: [
          { id: "p1", name: "Alice" },
          { id: "p2", name: "Bob", isBot: true },
        ],
        seed: 12345,
      });

      expect(state.playerOrder).toEqual(["p1", "p2"]);
      expect(state.players["p1"]?.hand.length).toBe(5);
      expect(state.players["p2"]?.hand.length).toBe(5);
      expect(state.discardPile.length).toBe(1);
      expect(state.turnPhase).toBe("discard");
    });

    it("executes a valid discard and draw turn", () => {
      let state = createLeastCountGame({
        players: [
          { id: "p1", name: "Alice" },
          { id: "p2", name: "Bob", isBot: true },
        ],
        seed: 12345,
      });

      const p1 = state.players["p1"]!;
      const cardToDiscard = p1.hand[0]!;

      // 1. Discard
      const discardRes = handleDiscardCards(state, "p1", [cardToDiscard.instanceId]);
      state = discardRes.state;

      expect(state.turnPhase).toBe("draw");
      expect(state.players["p1"]?.hand.length).toBe(4);
      expect(state.discardPile[state.discardPile.length - 1]?.instanceId).toBe(cardToDiscard.instanceId);

      // 2. Draw
      const drawRes = handleDrawCard(state, "p1", "deck");
      state = drawRes.state;

      expect(state.turnPhase).toBe("discard");
      expect(state.players["p1"]?.hand.length).toBe(5);
      expect(state.activePlayerId).toBe("p2"); // Turn passed to next player
    });
  });

  describe("Declare Show & Scoring", () => {
    it("rewards caller with 0 points on a successful show", () => {
      const state = createLeastCountGame({
        players: [
          { id: "p1", name: "Alice" },
          { id: "p2", name: "Bob", isBot: true },
        ],
      });

      // Give p1 low hand (3 pts) and p2 high hand (20 pts)
      state.players["p1"]!.hand = [
        { instanceId: "1", suit: "spades", rank: "A", points: 1, rankValue: 1, isJoker: false },
        { instanceId: "2", suit: "hearts", rank: "2", points: 2, rankValue: 2, isJoker: false },
      ];
      state.players["p2"]!.hand = [
        { instanceId: "3", suit: "spades", rank: "K", points: 10, rankValue: 13, isJoker: false },
        { instanceId: "4", suit: "hearts", rank: "Q", points: 10, rankValue: 12, isJoker: false },
      ];

      const res = handleDeclareShow(state, "p1");
      expect(res.state.status).toBe("round_end");
      expect(res.state.lastShowResult?.isSuccessful).toBe(true);
      expect(res.state.players["p1"]?.score).toBe(0); // Caller got 0 pts!
      expect(res.state.players["p2"]?.score).toBe(20); // Opponent added 20 pts
    });

    it("penalizes caller with +40 wrong show penalty if countered by opponent", () => {
      const state = createLeastCountGame({
        players: [
          { id: "p1", name: "Alice" },
          { id: "p2", name: "Bob", isBot: true },
        ],
      });

      // Give p1 6 pts and p2 4 pts (opponent has lower score!)
      state.players["p1"]!.hand = [
        { instanceId: "1", suit: "spades", rank: "6", points: 6, rankValue: 6, isJoker: false },
      ];
      state.players["p2"]!.hand = [
        { instanceId: "2", suit: "hearts", rank: "4", points: 4, rankValue: 4, isJoker: false },
      ];

      const res = handleDeclareShow(state, "p1");
      expect(res.state.lastShowResult?.isSuccessful).toBe(false);
      expect(res.state.players["p1"]?.score).toBe(46); // 6 pts + 40 penalty!
      expect(res.state.players["p2"]?.score).toBe(0); // Opponent got 0 pts!
    });
  });

  describe("Engine Registry & Bot AI", () => {
    it("is registered in the central GAME_REGISTRY", () => {
      const engine = getGameEngine("least_count");
      expect(engine).toBeDefined();
      expect(engine.displayName).toBe("Least Count");
      expect(engine.gameType).toBe("least_count");
    });

    it("bot automatically computes strategic moves", () => {
      const state = createLeastCountGame({
        players: [
          { id: "p1", name: "Alice" },
          { id: "bot1", name: "Bot Atlas", isBot: true },
        ],
      });
      state.activePlayerId = "bot1";

      const action = LeastCountBotController.getNextBotAction(state, "bot1");
      expect(action).toBeDefined();
      expect(["declare_show", "discard_cards"]).toContain(action?.type);
    });
  });
});
