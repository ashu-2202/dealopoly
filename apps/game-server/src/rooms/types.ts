import type { WebSocket } from "ws";
import type { GameState } from "@dealopoly/game-engine";

export interface RoomSeat {
  seatIndex: number;
  playerId: string;
  name: string;
  isBot: boolean;
  sessionToken: string;
  isConnected: boolean;
  socket?: WebSocket;
}

export type RoomStatus = "lobby" | "in_progress" | "completed";

export interface Room {
  code: string;
  hostPlayerId: string;
  status: RoomStatus;
  seats: RoomSeat[];
  maxSeats: number;
  gameState?: GameState;
  createdAt: number;
  lastActivityAt: number;
}

export interface PublicRoomSeat {
  seatIndex: number;
  playerId: string;
  name: string;
  isBot: boolean;
  isConnected: boolean;
}

export interface PublicRoomInfo {
  code: string;
  hostPlayerId: string;
  status: RoomStatus;
  seats: PublicRoomSeat[];
  maxSeats: number;
  isStarted: boolean;
}
