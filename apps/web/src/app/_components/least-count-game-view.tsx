"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLeastCountClient } from "../../lib/use-least-count-client";
import { LeastCountBoard } from "./least-count-board";
import { CardLoader } from "./card-loader";
import { UserNav } from "./user-nav";
import { getStoredProfile } from "../../lib/session";

interface LeastCountGameViewProps {
  roomCode?: string;
  isBotMode?: boolean;
  botCount?: number;
  playerName?: string;
  playerId?: string;
}

export const LeastCountGameView: React.FC<LeastCountGameViewProps> = ({
  roomCode,
  isBotMode = true,
  botCount = 2,
  playerName,
  playerId,
}) => {
  const router = useRouter();
  const profile = getStoredProfile();
  const activePlayerId = playerId || profile.id;

  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  const {
    gameState,
    discardCards,
    drawCard,
    declareShow,
    startNextRound,
    lastError,
  } = useLeastCountClient({
    roomCode,
    playerId: activePlayerId,
    isLocalMode: isBotMode,
    botCount,
    playerName,
  });

  const handleLeave = () => {
    router.push("/lobby");
  };

  if (!gameState) {
    return (
      <div className="game-table-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <CardLoader game="lowdeck" size="lg" text="Entering Lowdeck Table..." />
      </div>
    );
  }

  const isMyTurn = gameState.activePlayerId === activePlayerId;

  return (
    <div className="game-table-shell">
      {/* 1. Game Topbar */}
      <header className="game-topbar">
        <div className="game-topbar-brand">
          <Link href="/" className="game-brand-pill">
            <span className="game-brand-icon">LC</span>
            <span className="game-brand-name">Least Count</span>
          </Link>

          {/* Turn Indicator Pill */}
          <div className={`game-turn-pill ${isMyTurn ? "game-turn-pill--active" : ""}`}>
            <span className="game-turn-pill-dot" />
            <span className="game-turn-pill-text">
              {isMyTurn ? `Your Turn (${gameState.turnPhase})` : `${gameState.players[gameState.activePlayerId]?.name || "Opponent"}'s Turn`}
            </span>
          </div>
        </div>

        {/* Topbar Right Controls */}
        <div className="game-topbar-actions">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span className="badge-dot" style={{ background: "#10b981" }} />
            <span className="badge-text" style={{ fontSize: "0.72rem" }}>
              Round {gameState.roundNumber} • Threshold ≤ {gameState.showThreshold} pts
            </span>
          </div>

          <button
            type="button"
            className="game-topbar-leave-btn"
            title="Leave Match"
            onClick={() => setIsExitDialogOpen(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>
              exit_to_app
            </span>
            <span className="game-desktop-only">Leave Game</span>
          </button>
        </div>
      </header>

      {/* 2. Error Bar */}
      {lastError && (
        <div
          style={{
            position: "absolute",
            top: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "#93000a",
            border: "1px solid #ffb4ab",
            color: "#ffdad6",
            padding: "6px 16px",
            borderRadius: "999px",
            fontSize: "0.78rem",
            fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
          }}
        >
          {lastError}
        </div>
      )}

      {/* 3. Least Count Board */}
      <main className="game-main-arena" style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <LeastCountBoard
          gameState={gameState}
          localPlayerId={activePlayerId}
          onDiscard={discardCards}
          onDraw={drawCard}
          onDeclareShow={declareShow}
          onStartNextRound={startNextRound}
          onLeaveGame={handleLeave}
        />
      </main>

      {/* 4. Exit Confirmation Modal */}
      {isExitDialogOpen && (
        <div className="game-modal-overlay">
          <div className="game-modal-container" style={{ maxWidth: "400px", padding: "24px", textAlign: "center" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 8px" }}>Leave Match?</h3>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: "0 0 20px" }}>
              Are you sure you want to return to the lobby?
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setIsExitDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={handleLeave}
              >
                Confirm Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
