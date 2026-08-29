import { randomBytes, randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import {
  createGame,
  applyCommand,
  getMaskedView,
  type GameCommand,
  type GameEvent,
  type GameState,
} from "@dealopoly/game-engine";
import {
  db,
  users,
  players,
  rooms,
  roomSeats,
  games,
  gameEvents,
  gameSnapshots,
  gameCommands,
  eq,
  inArray,
  sql,
} from "@dealopoly/db";
import type { Room, RoomSeat, PublicRoomInfo, RoomStatus } from "./types.js";

export class RoomManager {
  private rooms = new Map<string, Room>();
  private disconnectTimers = new Map<string, NodeJS.Timeout>();
  private hasAttemptedHydration = false;

  constructor() {
    // 2-hour periodic sweep for abandoned/idle rooms
    setInterval(() => {
      this.sweepIdleRooms();
    }, 30 * 60 * 1000); // Check every 30 minutes
  }

  private sweepIdleRooms() {
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.lastActivityAt > TWO_HOURS) {
        console.log(`[Room Sweeper] Room ${code} has been idle for 2+ hours. Abandoning...`);
        // Abandon game in memory and DB
        if (room.status === "in_progress" || room.status === "lobby") {
          this.abandonRoom(code, "idle_timeout");
        } else {
          this.rooms.delete(code);
        }
      }
    }
  }

  /**
   * Generates a 6-digit numeric room code
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

  /**
   * Safe DB helper: executes a DB operation if DATABASE_URL is available.
   * Catches and logs errors without disrupting active memory operations.
   */
  private async safeDb<T>(op: () => Promise<T>, desc: string): Promise<T | null> {
    if (!process.env["DATABASE_URL"]) {
      return null;
    }
    try {
      return await op();
    } catch (err: unknown) {
      console.error(`[DB Error: ${desc}]`, err instanceof Error ? err.message : err);
      return null;
    }
  }

  public async createRoom(
    hostName: string,
    options?: { botCount?: number; userId?: string },
  ): Promise<{ room: Room; hostPlayerId: string; sessionToken: string }> {
    const roomId = randomUUID();
    const code = this.generateRoomCode();
    const hostPlayerId = randomUUID();
    const hostSessionToken = this.generateSessionToken();
    const displayName = hostName.trim() || "Host";

    const hostSeat: RoomSeat = {
      seatIndex: 0,
      playerId: hostPlayerId,
      name: displayName,
      isBot: false,
      sessionToken: hostSessionToken,
      isConnected: false,
    };

    const seats: RoomSeat[] = [hostSeat];

    // Add initial bots if requested (up to 4 bots, max 5 players total)
    const botCount = Math.min(Math.max(0, options?.botCount ?? 0), 4);
    const botPlayersToInsert: { id: string; displayName: string; sessionToken: string; isBot: boolean }[] = [];
    const botNames = ["Atlas", "Nova", "Cipher", "Vortex"];

    for (let i = 0; i < botCount; i++) {
      const botId = randomUUID();
      const botToken = this.generateSessionToken();
      const botName = `Bot ${botNames[i] ?? i + 1}`;

      seats.push({
        seatIndex: seats.length,
        playerId: botId,
        name: botName,
        isBot: true,
        sessionToken: botToken,
        isConnected: true,
      });

      botPlayersToInsert.push({
        id: botId,
        displayName: botName,
        sessionToken: botToken,
        isBot: true,
      });
    }

    const room: Room = {
      id: roomId,
      code,
      hostPlayerId,
      status: "lobby",
      seats,
      maxSeats: 5,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    this.rooms.set(code, room);

    // Persist to Neon Postgres
    await this.safeDb(async () => {
      // 1. Insert host player & bot players
      await db.insert(players).values([
        {
          id: hostPlayerId,
          userId: options?.userId ?? null,
          displayName,
          sessionToken: hostSessionToken,
          isBot: false,
        },
        ...botPlayersToInsert,
      ]);

      // 2. Insert room
      await db.insert(rooms).values({
        id: roomId,
        code,
        hostPlayerId,
        status: "lobby",
        maxSeats: 5,
      });

      // 3. Insert seats
      await db.insert(roomSeats).values(
        seats.map((s) => ({
          roomId,
          playerId: s.playerId,
          seatIndex: s.seatIndex,
          sessionToken: s.sessionToken,
        })),
      );
    }, `createRoom (${code})`);

    return { room, hostPlayerId, sessionToken: hostSessionToken };
  }

  public getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  public async joinRoom(
    code: string,
    playerName: string,
    options?: { userId?: string },
  ): Promise<{ room: Room; playerId: string; sessionToken: string }> {
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

    const playerId = randomUUID();
    const sessionToken = this.generateSessionToken();
    const displayName = playerName.trim() || `Player ${room.seats.length + 1}`;
    const seatIndex = room.seats.length;

    const newSeat: RoomSeat = {
      seatIndex,
      playerId,
      name: displayName,
      isBot: false,
      sessionToken,
      isConnected: false,
    };

    room.seats.push(newSeat);
    room.lastActivityAt = Date.now();

    this.broadcastRoomInfo(room);

    // Persist to Neon Postgres
    await this.safeDb(async () => {
      await db.insert(players).values({
        id: playerId,
        userId: options?.userId ?? null,
        displayName,
        sessionToken,
        isBot: false,
      });

      if (room.id) {
        await db.insert(roomSeats).values({
          roomId: room.id,
          playerId,
          seatIndex,
          sessionToken,
        });

        await db
          .update(rooms)
          .set({ lastActivityAt: new Date() })
          .where(eq(rooms.id, room.id));
      }
    }, `joinRoom (${code}, ${displayName})`);

    return { room, playerId, sessionToken };
  }

  public async addBot(code: string, requesterPlayerId: string): Promise<Room> {
    const room = this.rooms.get(code);
    if (!room) throw new Error("Room not found");
    if (room.hostPlayerId !== requesterPlayerId) {
      throw new Error("Only the room host can add bots");
    }
    if (room.status !== "lobby") throw new Error("Cannot add bots once game has started");
    if (room.seats.length >= room.maxSeats) throw new Error("Room is full");

    const botIndex = room.seats.filter((s) => s.isBot).length;
    const botNames = ["Atlas", "Nova", "Cipher", "Vortex"];
    const botName = `Bot ${botNames[botIndex % botNames.length]}`;
    const botPlayerId = randomUUID();
    const sessionToken = this.generateSessionToken();
    const seatIndex = room.seats.length;

    room.seats.push({
      seatIndex,
      playerId: botPlayerId,
      name: botName,
      isBot: true,
      sessionToken,
      isConnected: true,
    });

    room.lastActivityAt = Date.now();
    this.broadcastRoomInfo(room);

    // Persist to Neon Postgres
    await this.safeDb(async () => {
      await db.insert(players).values({
        id: botPlayerId,
        displayName: botName,
        sessionToken,
        isBot: true,
      });

      if (room.id) {
        await db.insert(roomSeats).values({
          roomId: room.id,
          playerId: botPlayerId,
          seatIndex,
          sessionToken,
        });

        await db
          .update(rooms)
          .set({ lastActivityAt: new Date() })
          .where(eq(rooms.id, room.id));
      }
    }, `addBot (${code}, ${botName})`);

    return room;
  }

  public async removePlayer(
    code: string,
    requesterPlayerId: string,
    targetPlayerId: string,
  ): Promise<Room> {
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

    // Persist to Neon Postgres
    await this.safeDb(async () => {
      if (room.id) {
        await db
          .delete(roomSeats)
          .where(sql`${roomSeats.roomId} = ${room.id} AND ${roomSeats.playerId} = ${targetPlayerId}`);

        // Update remaining seat indices
        for (const seat of room.seats) {
          await db
            .update(roomSeats)
            .set({ seatIndex: seat.seatIndex })
            .where(sql`${roomSeats.roomId} = ${room.id} AND ${roomSeats.playerId} = ${seat.playerId}`);
        }

        await db
          .update(rooms)
          .set({ lastActivityAt: new Date() })
          .where(eq(rooms.id, room.id));
      }
    }, `removePlayer (${code}, ${targetPlayerId})`);

    return room;
  }

  public async startGame(code: string, requesterPlayerId: string): Promise<Room> {
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

    const gameId = randomUUID();
    const gameSeed = Math.floor(Math.random() * 1000000);

    const gameState = createGame({
      gameId,
      players: gamePlayers,
      seed: gameSeed,
    });

    room.status = "in_progress";
    room.gameState = gameState;
    room.dbGameId = gameId;
    room.nextSequenceNum = 1;
    room.lastActivityAt = Date.now();

    this.broadcastRoomInfo(room);
    this.broadcastGameState(room);

    // Persist to Neon Postgres
    await this.safeDb(async () => {
      if (room.id) {
        // 1. Create games record
        await db.insert(games).values({
          id: gameId,
          roomId: room.id,
          seed: gameSeed,
          status: "in_progress",
          playerOrder: gamePlayers.map((p) => p.id),
        });

        // 2. Update room status
        await db
          .update(rooms)
          .set({ status: "in_progress", lastActivityAt: new Date() })
          .where(eq(rooms.id, room.id));

        // 3. Save initial game event
        const seq = room.nextSequenceNum ?? 1;
        await db.insert(gameEvents).values({
          gameId,
          sequenceNum: seq,
          eventType: "game_started",
          playerId: requesterPlayerId,
          payload: {
            id: `evt-${Date.now()}-${seq}`,
            type: "game_started",
            timestamp: Date.now(),
            playerOrder: gamePlayers.map((p) => p.id),
            message: `Game started with ${gamePlayers.length} players`,
          },
        });
        room.nextSequenceNum = seq + 1;

        // 4. Initial GameState snapshot
        await db.insert(gameSnapshots).values({
          gameId,
          afterSequence: seq,
          stateJson: gameState,
        });
      }
    }, `startGame (${code})`);

    return room;
  }

  public async applyCommand(
    code: string,
    playerId: string,
    command: GameCommand,
  ): Promise<{ room: Room; events: GameEvent[] }> {
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

    // Persist to Neon Postgres
    await this.safeDb(async () => {
      const dbGameId = room.dbGameId;
      if (!dbGameId) return;

      let currentSeq = room.nextSequenceNum ?? 1;

      // 1. Audit log command
      await db.insert(gameCommands).values({
        gameId: dbGameId,
        sequenceNum: currentSeq,
        playerId,
        commandType: command.type,
        payload: command,
        accepted: true,
      });

      // 2. Save all generated events
      if (result.events && result.events.length > 0) {
        for (const evt of result.events) {
          currentSeq++;
          await db.insert(gameEvents).values({
            gameId: dbGameId,
            sequenceNum: currentSeq,
            eventType: evt.type,
            playerId: evt.playerId ?? playerId,
            payload: evt,
          });
        }
      }

      room.nextSequenceNum = currentSeq + 1;

      // 3. Update game completion / win
      if (result.nextState.status === "completed") {
        await db
          .update(games)
          .set({
            status: "completed",
            winnerId: result.nextState.winnerId,
            completedAt: new Date(),
          })
          .where(eq(games.id, dbGameId));

        if (room.id) {
          await db
            .update(rooms)
            .set({ status: "completed", lastActivityAt: new Date() })
            .where(eq(rooms.id, room.id));

          // Increment gamesPlayed & gamesWon for registered users
          const roomPlayerIds = room.seats.map((s) => s.playerId);
          if (roomPlayerIds.length > 0) {
            const playerRows = await db
              .select({ id: players.id, userId: players.userId })
              .from(players)
              .where(inArray(players.id, roomPlayerIds));

            for (const p of playerRows) {
              if (p.userId) {
                const isWinner = p.id === result.nextState.winnerId;
                await db
                  .update(users)
                  .set({
                    gamesPlayed: sql`${users.gamesPlayed} + 1`,
                    ...(isWinner ? { gamesWon: sql`${users.gamesWon} + 1` } : {}),
                  })
                  .where(eq(users.id, p.userId));
              }
            }
          }
        }
      }

      // 4. Periodic Snapshot: take a snapshot when turn ends or turn number % 5 == 0
      if (command.type === "end_turn" || (result.nextState.turn.turnNumber % 5 === 0)) {
        await db.insert(gameSnapshots).values({
          gameId: dbGameId,
          afterSequence: currentSeq,
          stateJson: result.nextState,
        });
      }
    }, `applyCommand (${code}, ${command.type})`);

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
    if (seat.isBot) {
      seat.isBot = false;
      if (room.gameState && room.gameState.players[playerId]) {
        room.gameState.players[playerId]!.isBot = false;
      }
      void this.safeDb(async () => {
         await db.update(players).set({ isBot: false }).where(eq(players.id, playerId));
      }, `revertBotToPlayer (${playerId})`);
      
      if (room.gameState) {
        this.broadcastGameState(room, [{
          id: `bot-reverted-${Date.now()}`,
          type: "player_joined",
          playerId,
          timestamp: Date.now(),
          message: `${seat.name} reconnected and took back their seat.`
        } as any]);
      }
    }
    room.lastActivityAt = Date.now();

    const timerKey = `${code}_${playerId}`;
    if (this.disconnectTimers.has(timerKey)) {
      clearTimeout(this.disconnectTimers.get(timerKey)!);
      this.disconnectTimers.delete(timerKey);
    }

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

    // Update player last seen time
    void this.safeDb(async () => {
      await db
        .update(players)
        .set({ lastSeenAt: new Date() })
        .where(eq(players.id, playerId));
    }, `attachSocket (${playerId})`);

    return seat;
  }

  public abandonRoom(code: string, reason: "idle_timeout" | "host_disconnected" | "host_left"): void {
    const room = this.rooms.get(code);
    if (!room) return;
    
    room.status = "completed"; // or "abandoned" depending on logic
    // Actually, we use 'abandoned' for rooms and games
    // But room status is strictly "lobby" | "in_progress" | "completed" | "abandoned" (wait, room_status check doesn't have abandoned in old db, oh yes we just added it to games_status_check, what about rooms_status_check?)
    // In schema.ts: rooms_status_check is IN ('lobby','in_progress','completed','abandoned')!
    room.status = "abandoned" as any; 
    
    // Broadcast ROOM_DESTROYED event
    this.broadcastToRoom(room, {
      type: "ERROR",
      code: "ROOM_DESTROYED",
      message: reason === "host_left" ? "The host has ended the game." : "The game was abandoned due to host inactivity.",
    });

    this.rooms.delete(code);

    // Update DB
    void this.safeDb(async () => {
      if (room.id) {
        await db.update(rooms).set({ status: "abandoned" }).where(eq(rooms.id, room.id));
      }
      if (room.dbGameId) {
        await db.update(games).set({ status: "abandoned" }).where(eq(games.id, room.dbGameId));
      }
    }, `abandonRoom (${code})`);
  }

  private handleDisconnectTimeout(code: string, playerId: string): void {
    this.disconnectTimers.delete(`${code}_${playerId}`);
    const room = this.rooms.get(code);
    if (!room) return;

    if (room.hostPlayerId === playerId) {
      this.abandonRoom(code, "host_disconnected");
    } else {
      this.convertPlayerToBot(code, playerId);
    }
  }

  public convertPlayerToBot(code: string, playerId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    
    const seat = room.seats.find(s => s.playerId === playerId);
    if (seat) {
      seat.isBot = true;
      seat.isConnected = false;
      seat.socket = undefined;
      if (room.gameState && room.gameState.players[playerId]) {
         room.gameState.players[playerId]!.isBot = true;
      }
      this.broadcastRoomInfo(room);
      if (room.gameState) {
        this.broadcastGameState(room, [{
          id: `bot-converted-${Date.now()}`,
          type: "player_left",
          playerId,
          timestamp: Date.now(),
          message: `${seat.name} left the game and was replaced by a bot.`
        } as any]);
      }
      
      void this.safeDb(async () => {
         await db.update(players).set({ isBot: true }).where(eq(players.id, playerId));
      }, `convertPlayerToBot (${playerId})`);
    }
  }

  public explicitLeave(code: string, playerId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    
    if (room.hostPlayerId === playerId) {
      this.abandonRoom(code, "host_left");
    } else {
      if (room.status === "lobby") {
        this.removePlayer(code, playerId, playerId).catch(console.error);
      } else {
        this.convertPlayerToBot(code, playerId);
      }
    }
  }

  private broadcastToRoom(room: Room, message: any): void {
    for (const seat of room.seats) {
      if (seat.socket && seat.socket.readyState === 1 /* OPEN */) {
        seat.socket.send(JSON.stringify(message));
      }
    }
  }

  public detachSocket(code: string, playerId: string, socket: WebSocket): void {
    const room = this.rooms.get(code);
    if (!room) return;

    const seat = room.seats.find((s) => s.playerId === playerId);
    if (seat && seat.socket === socket) {
      seat.isConnected = false;
      seat.socket = undefined;
      room.lastActivityAt = Date.now();
      this.broadcastRoomInfo(room);
      
      const timerKey = `${code}_${playerId}`;
      const timer = setTimeout(() => {
        this.handleDisconnectTimeout(code, playerId);
      }, 5 * 60 * 1000);
      this.disconnectTimers.set(timerKey, timer);

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

  /**
   * Hydrates active rooms and games from Neon Postgres on server boot.
   */
  public async hydrateRoomsFromDb(): Promise<number> {
    if (this.hasAttemptedHydration) return 0;
    this.hasAttemptedHydration = true;

    return (
      (await this.safeDb(async () => {
        // Query active rooms
        const activeRooms = await db
          .select()
          .from(rooms)
          .where(sql`${rooms.status} IN ('lobby', 'in_progress')`);

        if (!activeRooms || activeRooms.length === 0) return 0;

        let restoredCount = 0;
        for (const r of activeRooms) {
          // Fetch seats and players
          const seatsData = await db
            .select({
              seatIndex: roomSeats.seatIndex,
              playerId: roomSeats.playerId,
              sessionToken: roomSeats.sessionToken,
              displayName: players.displayName,
              isBot: players.isBot,
            })
            .from(roomSeats)
            .innerJoin(players, eq(roomSeats.playerId, players.id))
            .where(eq(roomSeats.roomId, r.id))
            .orderBy(roomSeats.seatIndex);

          const seats: RoomSeat[] = seatsData.map((s) => ({
            seatIndex: s.seatIndex,
            playerId: s.playerId,
            name: s.displayName,
            isBot: s.isBot,
            sessionToken: s.sessionToken,
            isConnected: s.isBot, // Bots are always connected
          }));

          const roomObj: Room = {
            id: r.id,
            code: r.code,
            hostPlayerId: r.hostPlayerId,
            status: r.status as RoomStatus,
            seats,
            maxSeats: r.maxSeats,
            createdAt: r.createdAt.getTime(),
            lastActivityAt: r.lastActivityAt.getTime(),
          };

          // If match is in progress, restore latest snapshot
          if (r.status === "in_progress") {
            const gameRow = await db
              .select()
              .from(games)
              .where(eq(games.roomId, r.id))
              .limit(1);

            if (gameRow && gameRow[0]) {
              roomObj.dbGameId = gameRow[0].id;

              const latestSnapshot = await db
                .select()
                .from(gameSnapshots)
                .where(eq(gameSnapshots.gameId, gameRow[0].id))
                .orderBy(sql`${gameSnapshots.afterSequence} DESC`)
                .limit(1);

              if (latestSnapshot && latestSnapshot[0]) {
                roomObj.gameState = latestSnapshot[0].stateJson as GameState;
                roomObj.nextSequenceNum = latestSnapshot[0].afterSequence + 1;
              }
            }
          }

          this.rooms.set(r.code, roomObj);
          restoredCount++;
        }

        console.log(`[Hydration] Restored ${restoredCount} active room(s) from Neon Postgres`);
        return restoredCount;
      }, "hydrateRoomsFromDb")) ?? 0
    );
  }
}
