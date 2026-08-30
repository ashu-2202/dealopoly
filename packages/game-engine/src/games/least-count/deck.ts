export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface LeastCountCard {
  instanceId: string;
  suit: Suit;
  rank: Rank;
  points: number; // K=0, A=1, 2-10=face, J=11, Q=12
  rankValue: number; // A=1, 2=2... 10=10, J=11, Q=12, K=13
  deckNumber?: number; // 1 or 2 when playing with multi-deck
}

/**
 * Returns point value for Least Count card:
 * - King (K) = 0 points
 * - Ace (A) = 1 point
 * - 2 to 10 = Face value (2 to 10 points)
 * - Jack (J) = 11 points
 * - Queen (Q) = 12 points
 */
export function getRankPoints(rank: Rank): number {
  if (rank === "K") return 0;
  if (rank === "A") return 1;
  if (rank === "J") return 11;
  if (rank === "Q") return 12;
  return parseInt(rank, 10);
}

/**
 * Returns numeric sequence value for run checking:
 * A=1, 2=2... 10=10, J=11, Q=12, K=13
 */
export function getRankNumericValue(rank: Rank): number {
  if (rank === "A") return 1;
  if (rank === "J") return 11;
  if (rank === "Q") return 12;
  if (rank === "K") return 13;
  return parseInt(rank, 10);
}

/**
 * Creates a standard 52-card deck (or 2 decks / 104 cards for 3-6 players).
 * Jokers are excluded.
 */
export function createLeastCountDeck(playerCount: number = 2): LeastCountCard[] {
  const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
  const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deckCount = playerCount >= 3 ? 2 : 1;
  const deck: LeastCountCard[] = [];

  for (let d = 1; d <= deckCount; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          instanceId: `lc-d${d}-${suit}-${rank}-${Math.random().toString(36).substring(2, 7)}`,
          suit,
          rank,
          points: getRankPoints(rank),
          rankValue: getRankNumericValue(rank),
          deckNumber: d,
        });
      }
    }
  }

  return deck;
}
