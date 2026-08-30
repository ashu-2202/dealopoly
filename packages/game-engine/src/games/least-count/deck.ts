export type Suit = "spades" | "hearts" | "diamonds" | "clubs" | "none";
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
  | "K"
  | "JOKER";

export interface LeastCountCard {
  instanceId: string;
  suit: Suit;
  rank: Rank;
  points: number;
  rankValue: number; // A=1, 2=2... 10=10, J=11, Q=12, K=13, Joker=0
  isJoker: boolean;
}

export function getRankPoints(rank: Rank): number {
  if (rank === "JOKER") return 0;
  if (rank === "A") return 1;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return parseInt(rank, 10);
}

export function getRankNumericValue(rank: Rank): number {
  if (rank === "JOKER") return 0;
  if (rank === "A") return 1;
  if (rank === "J") return 11;
  if (rank === "Q") return 12;
  if (rank === "K") return 13;
  return parseInt(rank, 10);
}

/**
 * Creates a standard 54-card deck (52 standard cards + 2 Jokers)
 */
export function createLeastCountDeck(includeJokers: boolean = true): LeastCountCard[] {
  const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
  const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck: LeastCountCard[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        instanceId: `lc-${suit}-${rank}-${Math.random().toString(36).substring(2, 7)}`,
        suit,
        rank,
        points: getRankPoints(rank),
        rankValue: getRankNumericValue(rank),
        isJoker: false,
      });
    }
  }

  if (includeJokers) {
    deck.push({
      instanceId: `lc-joker-red-${Math.random().toString(36).substring(2, 7)}`,
      suit: "hearts",
      rank: "JOKER",
      points: 0,
      rankValue: 0,
      isJoker: true,
    });
    deck.push({
      instanceId: `lc-joker-black-${Math.random().toString(36).substring(2, 7)}`,
      suit: "spades",
      rank: "JOKER",
      points: 0,
      rankValue: 0,
      isJoker: true,
    });
  }

  return deck;
}
