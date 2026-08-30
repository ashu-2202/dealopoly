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

describe("Least Count (Tailored Rules) Game Engine", () => {
  describe("Deck Scaling & Point Values", () => {
    it("creates a 52-card deck for 2 players with no Jokers", () => {
      const deck = createLeastCountDeck(2);
      expect(deck.length).toBe(52);
      expect(deck.some((c) => (c as any).isJoker)).toBe(false);
    });

    it("creates a 104-card (2 decks) setup for 3 to 6 players", () => {
      const deck3 = createLeastCountDeck(3);
      expect(deck3.length).toBe(104);

      const deck6 = createLeastCountDeck(6);
      expect(deck6.length).toBe(104);
    });

    it("assigns exact point values: King=0, Ace=1, J=11, Q=12, 2-10=face value", () => {
      const deck = createLeastCountDeck(2);

      const kings = deck.filter((c) => c.rank === "K");
      expect(kings.length).toBe(4);
      expect(kings.every((c) => c.points === 0)).toBe(true);

      const aces = deck.filter((c) => c.rank === "A");
      expect(aces.every((c) => c.points === 1)).toBe(true);

      const jacks = deck.filter((c) => c.rank === "J");
      expect(jacks.every((c) => c.points === 11)).toBe(true);

      const queens = deck.filter((c) => c.rank === "Q");
      expect(queens.every((c) => c.points === 12)).toBe(true);

      const tens = deck.filter((c) => c.rank === "10");
      expect(tens.every((c) => c.points === 10)).toBe(true);
    });

    it("calculates hand score correctly with King=0, J=11, Q=12", () => {
      const hand: LeastCountCard[] = [
        { instanceId: "1", suit: "spades", rank: "K", points: 0, rankValue: 13 },
        { instanceId: "2", suit: "hearts", rank: "A", points: 1, rankValue: 1 },
        { instanceId: "3", suit: "diamonds", rank: "J", points: 11, rankValue: 11 },
        { instanceId: "4", suit: "clubs", rank: "Q", points: 12, rankValue: 12 },
        { instanceId: "5", suit: "spades", rank: "7", points: 7, rankValue: 7 },
      ];
      // 0 + 1 + 11 + 12 + 7 = 31
      expect(calculateHandScore(hand)).toBe(31);
    });
  });

  describe("Custom Discard Rules", () => {
    it("allows dropping a single card", () => {
      const card: LeastCountCard = { instanceId: "1", suit: "spades", rank: "Q", points: 12, rankValue: 12 };
      expect(validateDiscardCombination([card]).valid).toBe(true);
    });

    it("allows dropping 2 cards of the exact same rank (e.g. two Kings)", () => {
      const twoKings: LeastCountCard[] = [
        { instanceId: "1", suit: "spades", rank: "K", points: 0, rankValue: 13 },
        { instanceId: "2", suit: "hearts", rank: "K", points: 0, rankValue: 13 },
      ];
      expect(validateDiscardCombination(twoKings).valid).toBe(true);

      const twoSevens: LeastCountCard[] = [
        { instanceId: "3", suit: "diamonds", rank: "7", points: 7, rankValue: 7 },
        { instanceId: "4", suit: "clubs", rank: "7", points: 7, rankValue: 7 },
      ];
      expect(validateDiscardCombination(twoSevens).valid).toBe(true);
    });

    it("rejects dropping 2 cards of different ranks", () => {
      const mismatchPair: LeastCountCard[] = [
        { instanceId: "1", suit: "spades", rank: "K", points: 0, rankValue: 13 },
        { instanceId: "2", suit: "hearts", rank: "Q", points: 12, rankValue: 12 },
      ];
      const result = validateDiscardCombination(mismatchPair);
      expect(result.valid).toBe(false);
    });

    it("allows dropping a 3-card increasing sequence in the same suit (e.g. 5-6-7 of Hearts)", () => {
      const run: LeastCountCard[] = [
        { instanceId: "1", suit: "hearts", rank: "5", points: 5, rankValue: 5 },
        { instanceId: "2", suit: "hearts", rank: "6", points: 6, rankValue: 6 },
        { instanceId: "3", suit: "hearts", rank: "7", points: 7, rankValue: 7 },
      ];
      expect(validateDiscardCombination(run).valid).toBe(true);

      const highRun: LeastCountCard[] = [
        { instanceId: "4", suit: "spades", rank: "10", points: 10, rankValue: 10 },
        { instanceId: "5", suit: "spades", rank: "J", points: 11, rankValue: 11 },
        { instanceId: "6", suit: "spades", rank: "Q", points: 12, rankValue: 12 },
      ];
      expect(validateDiscardCombination(highRun).valid).toBe(true);
    });

    it("rejects 3 cards from different suits or non-consecutive ranks", () => {
      const mixedSuitRun: LeastCountCard[] = [
        { instanceId: "1", suit: "hearts", rank: "5", points: 5, rankValue: 5 },
        { instanceId: "2", suit: "spades", rank: "6", points: 6, rankValue: 6 },
        { instanceId: "3", suit: "hearts", rank: "7", points: 7, rankValue: 7 },
      ];
      expect(validateDiscardCombination(mixedSuitRun).valid).toBe(false);

      const nonConsecutive: LeastCountCard[] = [
        { instanceId: "1", suit: "hearts", rank: "5", points: 5, rankValue: 5 },
        { instanceId: "2", suit: "hearts", rank: "7", points: 7, rankValue: 7 },
        { instanceId: "3", suit: "hearts", rank: "9", points: 9, rankValue: 9 },
      ];
      expect(validateDiscardCombination(nonConsecutive).valid).toBe(false);
    });

    it("rejects dropping 4 or more cards at once", () => {
      const fourCards: LeastCountCard[] = [
        { instanceId: "1", suit: "hearts", rank: "5", points: 5, rankValue: 5 },
        { instanceId: "2", suit: "hearts", rank: "6", points: 6, rankValue: 6 },
        { instanceId: "3", suit: "hearts", rank: "7", points: 7, rankValue: 7 },
        { instanceId: "4", suit: "hearts", rank: "8", points: 8, rankValue: 8 },
      ];
      expect(validateDiscardCombination(fourCards).valid).toBe(false);
    });
  });

  describe("Declare Show & Scoring", () => {
    it("rewards caller with 0 points when holding two Kings (0 pts) and Ace (1 pt)", () => {
      const state = createLeastCountGame({
        players: [
          { id: "p1", name: "Alice" },
          { id: "p2", name: "Bob", isBot: true },
        ],
      });

      // Give p1 two Kings and an Ace (total = 0 + 0 + 1 = 1 point!)
      state.players["p1"]!.hand = [
        { instanceId: "1", suit: "spades", rank: "K", points: 0, rankValue: 13 },
        { instanceId: "2", suit: "hearts", rank: "K", points: 0, rankValue: 13 },
        { instanceId: "3", suit: "diamonds", rank: "A", points: 1, rankValue: 1 },
      ];
      // Give p2 Queen + 10 (total = 12 + 10 = 22 points)
      state.players["p2"]!.hand = [
        { instanceId: "4", suit: "spades", rank: "Q", points: 12, rankValue: 12 },
        { instanceId: "5", suit: "hearts", rank: "10", points: 10, rankValue: 10 },
      ];

      const res = handleDeclareShow(state, "p1");
      expect(res.state.status).toBe("round_end");
      expect(res.state.lastShowResult?.isSuccessful).toBe(true);
      expect(res.state.lastShowResult?.callerScore).toBe(1);
      expect(res.state.players["p1"]?.score).toBe(0);
      expect(res.state.players["p2"]?.score).toBe(22);
    });

    it("penalizes caller with +40 wrong show penalty if countered by opponent", () => {
      const state = createLeastCountGame({
        players: [
          { id: "p1", name: "Alice" },
          { id: "p2", name: "Bob", isBot: true },
        ],
      });

      // Give p1 a 7 (7 pts)
      state.players["p1"]!.hand = [
        { instanceId: "1", suit: "spades", rank: "7", points: 7, rankValue: 7 },
      ];
      // Give p2 two Kings (0 pts!)
      state.players["p2"]!.hand = [
        { instanceId: "2", suit: "hearts", rank: "K", points: 0, rankValue: 13 },
        { instanceId: "3", suit: "diamonds", rank: "K", points: 0, rankValue: 13 },
      ];

      const res = handleDeclareShow(state, "p1");
      expect(res.state.lastShowResult?.isSuccessful).toBe(false);
      expect(res.state.players["p1"]?.score).toBe(47); // 7 pts + 40 penalty!
      expect(res.state.players["p2"]?.score).toBe(0); // Opponent got 0 pts!
    });
  });

  describe("Bot AI Strategy", () => {
    it("bot holds Kings (0 pts) and discards high cards (Q=12 pts)", () => {
      const state = createLeastCountGame({
        players: [
          { id: "p1", name: "Alice" },
          { id: "bot1", name: "Bot Atlas", isBot: true },
        ],
      });
      state.activePlayerId = "bot1";

      // Give bot a King (0 pts), a 2 (2 pts), and a Queen (12 pts)
      state.players["bot1"]!.hand = [
        { instanceId: "k1", suit: "spades", rank: "K", points: 0, rankValue: 13 },
        { instanceId: "n2", suit: "hearts", rank: "2", points: 2, rankValue: 2 },
        { instanceId: "q1", suit: "diamonds", rank: "Q", points: 12, rankValue: 12 },
      ];

      const action = LeastCountBotController.getNextBotAction(state, "bot1");
      expect(action?.type).toBe("discard_cards");
      if (action?.type === "discard_cards") {
        expect(action.cardInstanceIds).toEqual(["q1"]); // Sheds the Queen (12 pts)!
      }
    });

    it("bot calls SHOW when holding two Kings (0 pts)", () => {
      const state = createLeastCountGame({
        players: [
          { id: "p1", name: "Alice" },
          { id: "bot1", name: "Bot Atlas", isBot: true },
        ],
      });
      state.activePlayerId = "bot1";

      state.players["bot1"]!.hand = [
        { instanceId: "k1", suit: "spades", rank: "K", points: 0, rankValue: 13 },
        { instanceId: "k2", suit: "hearts", rank: "K", points: 0, rankValue: 13 },
      ];

      const action = LeastCountBotController.getNextBotAction(state, "bot1");
      expect(action?.type).toBe("declare_show");
    });
  });
});
