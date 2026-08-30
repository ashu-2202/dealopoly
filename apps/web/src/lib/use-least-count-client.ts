"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createLeastCountGame,
  handleDiscardCards,
  handleDrawCard,
  handleDeclareShow,
  handleStartNextRound,
  getMaskedLeastCountView,
  LeastCountBotController,
  type LeastCountGameState,
  type MaskedLeastCountGameState,
  type LeastCountCommand,
} from "@dealopoly/game-engine";
import { getStoredProfile } from "./session";

export interface UseLeastCountClientOptions {
  roomCode?: string;
  playerId?: string;
  isLocalMode?: boolean;
  botCount?: number;
  playerName?: string;
}

const DEFAULT_BOT_ROSTER = [
  { id: "bot-atlas", name: "Bot Atlas" },
  { id: "bot-nova", name: "Bot Nova" },
  { id: "bot-orion", name: "Bot Orion" },
  { id: "bot-luna", name: "Bot Luna" },
];

export function useLeastCountClient({
  roomCode,
  playerId: initialPlayerId,
  isLocalMode = true,
  botCount = 2,
  playerName,
}: UseLeastCountClientOptions) {
  const profile = getStoredProfile();
  const playerId = initialPlayerId || profile.id;
  const activePlayerName = playerName?.trim() || profile.name || "Player";

  const [gameState, setGameState] = useState<MaskedLeastCountGameState | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const localGameRef = useRef<LeastCountGameState | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lastError) return;
    const timer = setTimeout(() => setLastError(null), 4000);
    return () => clearTimeout(timer);
  }, [lastError]);

  const syncState = useCallback(() => {
    if (!localGameRef.current) return;
    const masked = getMaskedLeastCountView(localGameRef.current, playerId);
    setGameState(masked);
  }, [playerId]);

  const initLocalGame = useCallback(() => {
    setLastError(null);
    const safeCount = Math.min(Math.max(botCount, 1), 4);
    const chosenBots = DEFAULT_BOT_ROSTER.slice(0, safeCount).map((b) => ({
      id: b.id,
      name: b.name,
      isBot: true,
    }));

    const players = [
      { id: playerId, name: activePlayerName, isBot: false },
      ...chosenBots,
    ];

    const game = createLeastCountGame({
      players,
      seed: Date.now(),
    });

    localGameRef.current = game;
    syncState();
  }, [botCount, playerId, activePlayerName, syncState]);

  // Bot Turn Automation Loop
  useEffect(() => {
    if (!localGameRef.current) return;
    const state = localGameRef.current;

    if (state.status === "completed") return;

    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }

    const activePlayer = state.players[state.activePlayerId];
    if (activePlayer && activePlayer.isBot && state.status === "in_progress") {
      botTimerRef.current = setTimeout(() => {
        if (!localGameRef.current) return;
        const botAction = LeastCountBotController.getNextBotAction(
          localGameRef.current,
          state.activePlayerId,
        );

        if (botAction) {
          try {
            if (botAction.type === "declare_show") {
              const res = handleDeclareShow(localGameRef.current, botAction.playerId);
              localGameRef.current = res.state;
            } else if (botAction.type === "discard_cards") {
              const res = handleDiscardCards(
                localGameRef.current,
                botAction.playerId,
                botAction.cardInstanceIds,
              );
              localGameRef.current = res.state;
            } else if (botAction.type === "draw_card") {
              const res = handleDrawCard(
                localGameRef.current,
                botAction.playerId,
                botAction.source,
              );
              localGameRef.current = res.state;
            }
            syncState();
          } catch (err: any) {
            console.error("Bot action error:", err);
          }
        }
      }, 750);
    }

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [gameState, syncState]);

  useEffect(() => {
    initLocalGame();
  }, [initLocalGame]);

  const discardCards = useCallback((cardIds: string[]) => {
    if (!localGameRef.current) return;
    try {
      const res = handleDiscardCards(localGameRef.current, playerId, cardIds);
      localGameRef.current = res.state;
      syncState();
    } catch (err: any) {
      setLastError(err.message || "Failed to discard cards");
    }
  }, [playerId, syncState]);

  const drawCard = useCallback((source: "deck" | "discard") => {
    if (!localGameRef.current) return;
    try {
      const res = handleDrawCard(localGameRef.current, playerId, source);
      localGameRef.current = res.state;
      syncState();
    } catch (err: any) {
      setLastError(err.message || "Failed to draw card");
    }
  }, [playerId, syncState]);

  const declareShow = useCallback(() => {
    if (!localGameRef.current) return;
    try {
      const res = handleDeclareShow(localGameRef.current, playerId);
      localGameRef.current = res.state;
      syncState();
    } catch (err: any) {
      setLastError(err.message || "Cannot declare Show");
    }
  }, [playerId, syncState]);

  const startNextRound = useCallback(() => {
    if (!localGameRef.current) return;
    try {
      const res = handleStartNextRound(localGameRef.current, playerId);
      localGameRef.current = res.state;
      syncState();
    } catch (err: any) {
      setLastError(err.message || "Cannot start next round");
    }
  }, [playerId, syncState]);

  return {
    gameState,
    discardCards,
    drawCard,
    declareShow,
    startNextRound,
    resetGame: initLocalGame,
    lastError,
  };
}
