import { randomBytes } from "node:crypto";
import type { WebSocket } from "ws";
import {
  createGame,
  applyCommand,
  getMaskedView,
  type GameCommand,
  type GameEvent,
} from "@dealopoly/game-engine";
import type { Room, RoomSeat, PublicRoomInfo } from "./types.js";

export class RoomManager {
  private rooms = new Map<string, Room>();

  /**
   * Generates a 6-digit uppercase room code
   */
  private generateRoomCode(): string {
    let code: string;
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (this.rooms.has(code));
    return code;
  }

  private generateSessionToken(): string {
    return randomBytes(16).toString("hex");
  }

  public createRoom(
    hostName: string,
    options?: { botCount?: number },
  ): { room: Room; hostPlayerId: string; sessionToken: string } {
    const code = this.generateRoomCode();
    const hostPlayerId = `p-${Date.now()}-${randomBytes(4).toString("hex")}`;
    const sessionToken = this.generateSessionToken();

    const hostSeat: RoomSeat = {
      seatIndex: 0,
      playerId: hostPlayerId,
      name: hostName.trim() || "Host",
      isBot: false,
      sessionToken,
      isConnected: false,
    };

    const seats: RoomSeat[] = [hostSeat];

    // Add initial bots if requested (up to 4 bots, max 5 players total)
    const botCount = Math.min(Math.max(0, options?.botCount ?? 0), 4);
    for (let i = 0; i < botCount; i++) {
      seats.push({
        seatIndex: seats.length,
        playerId: `bot-${i + 1}-${randomBytes(3).toString("hex")}`,
        name: `Bot ${["Atlas", "Nova", "Cipher", "Vortex"][i] ?? i + 1}`,
        isBot: true,
        sessionToken: this.generateSessionToken(),
        isConnected: true,
      });
    }

    const room: Room = {
      code,
      hostPlayerId,
      status: "lobby",
      seats,
      maxSeats: 5,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    this.rooms.set(code, room);
    return { room, hostPlayerId, sessionToken };
  }

  public getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  public joinRoom(
    code: string,
    playerName: string,
  ): { room: Room; playerId: string; sessionToken: string } {
    const room = this.rooms.get(code);
    if (!room) {
      throw new Error(`Room with code ${code} not found`);
    }

    if (room.status !== "lobby") {
      throw new Error("Game has already started in this room");
    }

    if (room.seats.length >= room.maxSeats) {
      throw new Error("Room is full (maximum 5 players)");
    }

    const playerId = `p-${Date.now()}-${randomBytes(4).toString("hex")}`;
    const sessionToken = this.generateSessionToken();

    const newSeat: RoomSeat = {
      seatIndex: room.seats.length,
      playerId,
      name: playerName.trim() || `Player ${room.seats.length + 1}`,
      isBot: false,
      sessionToken,
      isConnected: false,
    };

    room.seats.push(newSeat);
    room.lastActivityAt = Date.now();

    this.broadcastRoomInfo(room);
    return { room, playerId, sessionToken };
  }

  public addBot(code: string, requesterPlayerId: string): Room {
    const room = this.rooms.get(code);
    if (!room) throw new Error("Room not found");
    if (room.hostPlayerId !== requesterPlayerId) {
      throw new Error("Only the room host can add bots");
    }
    if (room.status !== "lobby") throw new Error("Cannot add bots once game has started");
    if (room.seats.length >= room.maxSeats) throw new Error("Room is full");

    const botIndex = room.seats.filter((s) => s.isBot).length;
    const botNames = ["Atlas", "Nova", "Cipher", "Vortex"];

    room.seats.push({
      seatIndex: room.seats.length,
      playerId: `bot-${Date.now()}-${randomBytes(3).toString("hex")}`,
      name: `Bot ${botNames[botIndex % botNames.length]}`,
      isBot: true,
      sessionToken: this.generateSessionToken(),
      isConnected: true,
    });

    room.lastActivityAt = Date.now();
    this.broadcastRoomInfo(room);
    return room;
  }

  public removePlayer(code: string, requesterPlayerId: string, targetPlayerId: string): Room {
    const room = this.rooms.get(code);
    if (!room) throw new Error("Room not found");
    if (room.hostPlayerId !== requesterPlayerId && requesterPlayerId !== targetPlayerId) {
      throw new Error("Only the host can remove players");
    }
    if (room.status !== "lobby") throw new Error("Cannot remove players during active match");

    const targetSeat = room.seats.find((s) => s.playerId === targetPlayerId);
    if (targetSeat?.socket) {
      targetSeat.socket.close(1000, "Removed from room");
    }

    room.seats = room.seats.filter((s) => s.playerId !== targetPlayerId);
    room.seats.forEach((s, idx) => {
      s.seatIndex = idx;
    });

    room.lastActivityAt = Date.now();
    this.broadcastRoomInfo(room);
    return room;
  }

  public startGame(code: string, requesterPlayerId: string): Room {
    const room = this.rooms.get(code);
    if (!room) throw new Error("Room not found");
    if (room.hostPlayerId !== requesterPlayerId) {
      throw new Error("Only the room host can start the game");
    }
    if (room.status !== "lobby") {
      throw new Error("Game has already started");
    }
    if (room.seats.length < 2) {
      throw new Error("At least 2 players (human or bots) are required to start");
    }

    const gamePlayers = room.seats.map((s) => ({
      id: s.playerId,
      name: s.name,
      isBot: s.isBot,
    }));

    const gameState = createGame({
      gameId: `match-${room.code}`,
      players: gamePlayers,
    });

    room.status = "in_progress";
    room.gameState = gameState;
    room.lastActivityAt = Date.now();

    this.broadcastGameState(room);
    return room;
  }

  public applyCommand(
    code: string,
    playerId: string,
    command: GameCommand,
  ): { room: Room; events: GameEvent[] } {
    const room = this.rooms.get(code);
    if (!room) throw new Error("Room not found");
    if (!room.gameState) throw new Error("No active game in this room");

    const result = applyCommand(room.gameState, command);
    room.gameState = result.nextState;

    if (result.nextState.status === "completed") {
      room.status = "completed";
    }

    room.lastActivityAt = Date.now();
    this.broadcastGameState(room, result.events);
    return { room, events: result.events };
  }

  public attachSocket(
    code: string,
    playerId: string,
    token: string,
    socket: WebSocket,
  ): RoomSeat {
    const room = this.rooms.get(code);
    if (!room) throw new Error("Room not found");

    const seat = room.seats.find((s) => s.playerId === playerId);
    if (!seat) throw new Error("Player seat not found in this room");

    if (seat.sessionToken !== token) {
      throw new Error("Invalid session token for this seat");
    }

    seat.socket = socket;
    seat.isConnected = true;
    room.lastActivityAt = Date.now();

    // Send initial sync to this connecting player
    this.sendToSeat(seat, {
      type: "ROOM_STATE",
      room: this.getPublicRoomInfo(room),
    });

    if (room.gameState) {
      const maskedView = getMaskedView(room.gameState, seat.playerId);
      this.sendToSeat(seat, {
        type: "GAME_STATE",
        state: maskedView,
      });
    }

    this.broadcastRoomInfo(room);
    return seat;
  }

  public detachSocket(code: string, playerId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;

    const seat = room.seats.find((s) => s.playerId === playerId);
    if (seat) {
      seat.isConnected = false;
      seat.socket = undefined;
      room.lastActivityAt = Date.now();
      this.broadcastRoomInfo(room);
    }
  }

  public getPublicRoomInfo(room: Room): PublicRoomInfo {
    return {
      code: room.code,
      hostPlayerId: room.hostPlayerId,
      status: room.status,
      maxSeats: room.maxSeats,
      isStarted: room.status !== "lobby",
      seats: room.seats.map((s) => ({
        seatIndex: s.seatIndex,
        playerId: s.playerId,
        name: s.name,
        isBot: s.isBot,
        isConnected: s.isConnected,
      })),
    };
  }

  public broadcastRoomInfo(room: Room): void {
    const payload = {
      type: "ROOM_STATE",
      room: this.getPublicRoomInfo(room),
    };
    for (const seat of room.seats) {
      this.sendToSeat(seat, payload);
    }
  }

  public broadcastGameState(room: Room, events?: GameEvent[]): void {
    if (!room.gameState) return;

    for (const seat of room.seats) {
      const masked = getMaskedView(room.gameState, seat.playerId);
      this.sendToSeat(seat, {
        type: "GAME_STATE",
        state: masked,
      });

      if (events && events.length > 0) {
        for (const evt of events) {
          this.sendToSeat(seat, {
            type: "GAME_EVENT",
            event: evt,
          });
        }
      }
    }
  }

  private sendToSeat(seat: RoomSeat, data: unknown): void {
    if (seat.socket && seat.isConnected && seat.socket.readyState === 1 /* OPEN */) {
      try {
        seat.socket.send(JSON.stringify(data));
      } catch {
        // Socket send error
      }
    }
  }
}
