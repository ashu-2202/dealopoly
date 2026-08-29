import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import type { WebSocket } from "ws";
import type { GameCommand } from "@dealopoly/game-engine";
import { RoomManager } from "./rooms/manager.js";
import { BotController } from "./bots/bot-controller.js";

export function createGameServer() {
  const server = Fastify({ logger: true });
  const roomManager = new RoomManager();

  // Register plugins
  server.register(cors, { origin: true });
  server.register(fastifyWebsocket);

  // Health endpoint
  server.get("/health", async () => ({
    service: "dealopoly-game-server",
    status: "ok",
    timestamp: Date.now(),
  }));

  // REST: Create Room
  server.post<{
    Body: { hostName?: string; botCount?: number };
  }>("/api/rooms", async (request, reply) => {
    const { hostName = "Host", botCount = 0 } = request.body || {};
    try {
      const { room, hostPlayerId, sessionToken } = roomManager.createRoom(hostName, {
        botCount,
      });
      return reply.code(201).send({
        roomCode: room.code,
        hostPlayerId,
        sessionToken,
        room: roomManager.getPublicRoomInfo(room),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create room";
      return reply.code(400).send({ error: message });
    }
  });

  // REST: Join Room
  server.post<{
    Body: { roomCode: string; playerName?: string };
  }>("/api/rooms/join", async (request, reply) => {
    const { roomCode, playerName = "Player" } = request.body || {};
    if (!roomCode) {
      return reply.code(400).send({ error: "Room code is required" });
    }

    try {
      const { room, playerId, sessionToken } = roomManager.joinRoom(roomCode, playerName);
      return reply.code(200).send({
        roomCode: room.code,
        playerId,
        sessionToken,
        room: roomManager.getPublicRoomInfo(room),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to join room";
      return reply.code(400).send({ error: message });
    }
  });

  // REST: Get Room Info
  server.get<{
    Params: { code: string };
  }>("/api/rooms/:code", async (request, reply) => {
    const { code } = request.params;
    const room = roomManager.getRoom(code);
    if (!room) {
      return reply.code(404).send({ error: "Room not found" });
    }
    return reply.code(200).send({
      room: roomManager.getPublicRoomInfo(room),
    });
  });

  // WebSocket Server Handler
  server.register(async (instance) => {
    instance.get(
      "/ws",
      { websocket: true },
      (socket: WebSocket, req) => {
        const query = req.query as Record<string, string | undefined>;
        const roomCode = query["room"];
        const playerId = query["player"];
        const token = query["token"];

        if (!roomCode || !playerId || !token) {
          socket.send(
            JSON.stringify({
              type: "ERROR",
              code: "MISSING_CREDENTIALS",
              message: "WebSocket connection requires room, player, and token parameters",
            }),
          );
          socket.close(1008, "Missing credentials");
          return;
        }

        try {
          roomManager.attachSocket(roomCode, playerId, token, socket);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to attach socket";
          socket.send(
            JSON.stringify({
              type: "ERROR",
              code: "AUTH_FAILED",
              message,
            }),
          );
          socket.close(1008, message);
          return;
        }

        socket.on("message", (raw) => {
          try {
            const data = JSON.parse(raw.toString());
            handleSocketMessage(roomCode, playerId, data, socket);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Invalid message format";
            socket.send(
              JSON.stringify({
                type: "ERROR",
                code: "INVALID_MESSAGE",
                message,
              }),
            );
          }
        });

        socket.on("close", () => {
          roomManager.detachSocket(roomCode, playerId);
        });
      },
    );
  });

  function handleSocketMessage(
    roomCode: string,
    playerId: string,
    data: Record<string, unknown>,
    socket: WebSocket,
  ) {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    switch (data["type"]) {
      case "PING":
        socket.send(JSON.stringify({ type: "PONG" }));
        break;

      case "START_GAME":
        try {
          roomManager.startGame(roomCode, playerId);
          triggerBotTurns(roomCode);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to start game";
          socket.send(JSON.stringify({ type: "ERROR", code: "START_FAILED", message }));
        }
        break;

      case "ADD_BOT":
        try {
          roomManager.addBot(roomCode, playerId);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to add bot";
          socket.send(JSON.stringify({ type: "ERROR", code: "ADD_BOT_FAILED", message }));
        }
        break;

      case "REMOVE_PLAYER":
        try {
          roomManager.removePlayer(roomCode, playerId, data["targetPlayerId"] as string);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to remove player";
          socket.send(JSON.stringify({ type: "ERROR", code: "REMOVE_FAILED", message }));
        }
        break;

      case "COMMAND":
        try {
          roomManager.applyCommand(roomCode, playerId, data["command"] as GameCommand);
          triggerBotTurns(roomCode);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Command rejected";
          socket.send(JSON.stringify({ type: "ERROR", code: "COMMAND_REJECTED", message }));
        }
        break;

      default:
        socket.send(
          JSON.stringify({
            type: "ERROR",
            code: "UNKNOWN_TYPE",
            message: `Unknown message type: ${data["type"]}`,
          }),
        );
    }
  }

  function triggerBotTurns(roomCode: string) {
    const room = roomManager.getRoom(roomCode);
    if (!room || !room.gameState || room.status !== "in_progress") return;

    let iterations = 0;
    const maxIterations = 30;

    const runNextBotStep = () => {
      if (!room.gameState || room.status !== "in_progress" || iterations++ > maxIterations) return;

      // Check if reaction or payment is waiting for a bot
      let targetBotId: string | null = null;

      if (room.gameState.pendingResolution?.type === "reaction_window") {
        const waitingId = room.gameState.pendingResolution.waitingForPlayerId;
        if (room.gameState.players[waitingId]?.isBot) {
          targetBotId = waitingId;
        }
      } else if (room.gameState.pendingResolution?.type === "payment") {
        const debtorId = room.gameState.pendingResolution.debtorPlayerId;
        if (room.gameState.players[debtorId]?.isBot) {
          targetBotId = debtorId;
        }
      } else if (room.gameState.pendingResolution?.type === "discard") {
        const pId = room.gameState.pendingResolution.playerId;
        if (room.gameState.players[pId]?.isBot) {
          targetBotId = pId;
        }
      } else if (room.gameState.players[room.gameState.turn.activePlayerId]?.isBot) {
        targetBotId = room.gameState.turn.activePlayerId;
      }

      if (!targetBotId) return;

      const botCommand = BotController.getNextBotAction(room.gameState, targetBotId);
      if (botCommand) {
        try {
          roomManager.applyCommand(roomCode, targetBotId, botCommand);
          // Chain next step if bot is still active or another bot needs to act
          setTimeout(runNextBotStep, 400);
        } catch {
          // Bot command error
        }
      }
    };

    setTimeout(runNextBotStep, 400);
  }

  return server;
}
