import type { CardColor } from "@dealopoly/shared";
import type { CardInstance } from "./state.js";

export type GameEventType =
  | "game_started"
  | "turn_started"
  | "cards_drawn"
  | "card_banked"
  | "property_played"
  | "wild_reorganized"
  | "action_played"
  | "rent_charged"
  | "reaction_prompted"
  | "reaction_submitted"
  | "action_cancelled"
  | "action_resolved"
  | "payment_requested"
  | "payment_submitted"
  | "cards_discarded"
  | "turn_ended"
  | "game_won";

export interface BaseGameEvent {
  id: string;
  timestamp: number;
  type: GameEventType;
  playerId?: string;
  message: string;
}

export interface GameStartedEvent extends BaseGameEvent {
  type: "game_started";
  playerOrder: string[];
}

export interface TurnStartedEvent extends BaseGameEvent {
  type: "turn_started";
  playerId: string;
  turnNumber: number;
}

export interface CardsDrawnEvent extends BaseGameEvent {
  type: "cards_drawn";
  playerId: string;
  count: number;
  drawnCards?: CardInstance[]; // only exposed to drawing player
}

export interface CardBankedEvent extends BaseGameEvent {
  type: "card_banked";
  playerId: string;
  card: CardInstance;
}

export interface PropertyPlayedEvent extends BaseGameEvent {
  type: "property_played";
  playerId: string;
  card: CardInstance;
  targetSetId: string;
  color: CardColor;
  isNewSet: boolean;
  setCompleted: boolean;
}

export interface WildReorganizedEvent extends BaseGameEvent {
  type: "wild_reorganized";
  playerId: string;
  card: CardInstance;
  fromSetId: string;
  toSetId: string;
  newColor: CardColor;
}

export interface ActionPlayedEvent extends BaseGameEvent {
  type: "action_played";
  playerId: string;
  actionCard: CardInstance;
  targetPlayerId?: string;
  targetSetId?: string;
  targetCardId?: string;
}

export interface RentChargedEvent extends BaseGameEvent {
  type: "rent_charged";
  playerId: string;
  rentCard: CardInstance;
  color: CardColor;
  amount: number;
  targetPlayerIds: string[];
  isDoubled: boolean;
}

export interface ReactionPromptedEvent extends BaseGameEvent {
  type: "reaction_prompted";
  targetPlayerId: string;
  actionCard: CardInstance;
}

export interface ReactionSubmittedEvent extends BaseGameEvent {
  type: "reaction_submitted";
  playerId: string;
  passed: boolean;
  justSayNoCard?: CardInstance;
}

export interface ActionCancelledEvent extends BaseGameEvent {
  type: "action_cancelled";
  actionCard: CardInstance;
  cancelledByPlayerId: string;
}

export interface ActionResolvedEvent extends BaseGameEvent {
  type: "action_resolved";
  actionCard: CardInstance;
}

export interface PaymentRequestedEvent extends BaseGameEvent {
  type: "payment_requested";
  creditorPlayerId: string;
  debtorPlayerId: string;
  amountDue: number;
  reason: string;
}

export interface PaymentSubmittedEvent extends BaseGameEvent {
  type: "payment_submitted";
  creditorPlayerId: string;
  debtorPlayerId: string;
  paidCards: CardInstance[];
  totalValue: number;
  amountDue: number;
}

export interface CardsDiscardedEvent extends BaseGameEvent {
  type: "cards_discarded";
  playerId: string;
  discardedCards: CardInstance[];
}

export interface TurnEndedEvent extends BaseGameEvent {
  type: "turn_ended";
  playerId: string;
  nextPlayerId: string;
}

export interface GameWonEvent extends BaseGameEvent {
  type: "game_won";
  winnerId: string;
  completedSetsCount: number;
}

export type GameEvent =
  | GameStartedEvent
  | TurnStartedEvent
  | CardsDrawnEvent
  | CardBankedEvent
  | PropertyPlayedEvent
  | WildReorganizedEvent
  | ActionPlayedEvent
  | RentChargedEvent
  | ReactionPromptedEvent
  | ReactionSubmittedEvent
  | ActionCancelledEvent
  | ActionResolvedEvent
  | PaymentRequestedEvent
  | PaymentSubmittedEvent
  | CardsDiscardedEvent
  | TurnEndedEvent
  | GameWonEvent;
