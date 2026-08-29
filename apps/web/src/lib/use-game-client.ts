"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createGame,
  applyCommand,
  getMaskedView,
  BotController,
  type GameState,
  type MaskedGameState,
  type GameCommand,
} from "@dealopoly/game-engine";
import { getStoredProfile } from "./session";

export interface UseGameClientOptions {
  roomCode?: string;
  playerId?: string;
  sessionToken?: string;
  isLocalMode?: boolean;
}

export function useGameClient({
  roomCode,
  playerId: initialPlayerId,
  sessionToken,
  isLocalMode = false,
}: UseGameClientOptions) {
  const profile = getStoredProfile();
  const playerId = initialPlayerId || profile.id;

  const [isLocal, setIsLocal] = useState(isLocalMode || !roomCode || roomCode === "solo");
  const [isConnected, setIsConnected] = useState(isLocal);
  const [gameState, setGameState] = useState<MaskedGameState | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Local State Machine
  const localGameRef = useRef<GameState | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // WebSocket Reference for Multiplayer
  const socketRef = useRef<WebSocket | null>(null);

  // Initialize Local Game
  const initLocalGame = useCallback(() => {
    setIsLocal(true);
    setIsConnected(true);
    setLastError(null);

    const players = [
      { id: playerId, name: profile.name, isBot: false },
      { id: "bot-atlas", name: "Bot Atlas", isBot: true },
      { id: "bot-nova", name: "Bot Nova", isBot: true },
    ];

    const rawGame = createGame({
      gameId: `solo-${Date.now()}`,
      players,
    });

    localGameRef.current = rawGame;
    setGameState(getMaskedView(rawGame, playerId));
  }, [playerId, profile.name]);

  // Local Bot Execution Loop
  const triggerLocalBotStep = useCallback(() => {
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
    }

    botTimerRef.current = setTimeout(() => {
      const raw = localGameRef.current;
      if (!raw || raw.status !== "in_progress") return;

      // Determine which bot needs to act
      let targetBotId: string | null = null;

      if (raw.pendingResolution?.type === "reaction_window") {
        const waitingId = raw.pendingResolution.waitingForPlayerId;
        if (raw.players[waitingId]?.isBot) {
          targetBotId = waitingId;
        }
      } else if (raw.pendingResolution?.type === "payment") {
        const debtorId = raw.pendingResolution.debtorPlayerId;
        if (raw.players[debtorId]?.isBot) {
          targetBotId = debtorId;
        }
      } else if (raw.pendingResolution?.type === "discard") {
        const pId = raw.pendingResolution.playerId;
        if (raw.players[pId]?.isBot) {
          targetBotId = pId;
        }
      } else if (raw.players[raw.turn.activePlayerId]?.isBot) {
        targetBotId = raw.turn.activePlayerId;
      }

      if (!targetBotId) return;

      const botCommand = BotController.getNextBotAction(raw, targetBotId);
      if (botCommand) {
        try {
          const result = applyCommand(raw, botCommand);
          localGameRef.current = result.nextState;
          setGameState(getMaskedView(result.nextState, playerId));

          // Chain next bot step
          triggerLocalBotStep();
        } catch {
          // Bot command error
        }
      }
    }, 600);
  }, [playerId]);

  // Apply Command (Local or Remote)
  const sendCommand = useCallback(
    (command: GameCommand) => {
      if (isLocal) {
        const raw = localGameRef.current;
        if (!raw) return;

        try {
          const result = applyCommand(raw, command);
          localGameRef.current = result.nextState;
          setGameState(getMaskedView(result.nextState, playerId));
          setLastError(null);

          // Trigger bot reactions/turns if needed
          triggerLocalBotStep();
        } catch (err: unknown) {
          setLastError(err instanceof Error ? err.message : "Invalid move");
        }
      } else {
        // Send via WebSocket
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: "COMMAND", command }));
        }
      }
    },
    [isLocal, playerId, triggerLocalBotStep],
  );

  // Setup mode
  useEffect(() => {
    if (isLocalMode || !roomCode || roomCode === "solo") {
      initLocalGame();
      return;
    }

    // Multiplayer mode via WebSocket
    setIsLocal(false);
    setIsConnected(false);

    const wsBase =
      process.env.NEXT_PUBLIC_WS_BASE ||
      (typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "ws://localhost:4000/ws"
        : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`);

    const url = `${wsBase}?room=${encodeURIComponent(roomCode)}&player=${encodeURIComponent(
      playerId,
    )}&token=${encodeURIComponent(sessionToken || "guest")}`;

    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setLastError(null);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "GAME_STATE") {
          setGameState(msg.state);
        } else if (msg.type === "ERROR") {
          setLastError(msg.message);
        }
      } catch {
        // Ignore parse error
      }
    };

    ws.onerror = () => {
      setLastError("Cannot reach game server on port 4000. You can switch to Instant Bot Mode.");
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [roomCode, playerId, sessionToken, isLocalMode, initLocalGame]);

  return {
    isLocal,
    isConnected,
    gameState,
    lastError,
    sendCommand,
    switchToLocalBotMode: initLocalGame,
  };
}
