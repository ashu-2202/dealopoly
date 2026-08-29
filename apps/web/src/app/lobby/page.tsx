"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../_components/app-shell";
import {
  getStoredProfile,
  saveRoomSession,
  getRoomSession,
} from "../../lib/session";
import { createRoomApi, joinRoomApi } from "../../lib/api";
import { useGameSocket } from "../../lib/use-game-socket";

export default function LobbyPage(props: {
  searchParams?: Promise<{ room?: string; player?: string; code?: string }>;
}) {
  const searchParams = props.searchParams ? use(props.searchParams) : undefined;
  const router = useRouter();

  const urlRoomCode = searchParams?.room || searchParams?.code;
  const urlPlayerName = searchParams?.player;

  const [roomCode, setRoomCode] = useState<string>(urlRoomCode || "");
  const [playerId, setPlayerId] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string>("");
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize room session
  useEffect(() => {
    async function initRoom() {
      const profile = getStoredProfile();
      const playerName = urlPlayerName || profile.name;

      if (urlRoomCode) {
        // Check for existing session token
        const existingSession = getRoomSession(urlRoomCode);
        if (existingSession) {
          setRoomCode(urlRoomCode);
          setPlayerId(existingSession.playerId);
          setSessionToken(existingSession.token);
        } else {
          // Join room via API
          try {
            const joinRes = await joinRoomApi({
              roomCode: urlRoomCode,
              playerName,
            });
            saveRoomSession(urlRoomCode, joinRes.playerId, joinRes.sessionToken);
            setRoomCode(joinRes.roomCode);
            setPlayerId(joinRes.playerId);
            setSessionToken(joinRes.sessionToken);
          } catch (err: unknown) {
            setInitError(err instanceof Error ? err.message : "Failed to join room");
          }
        }
      } else {
        // Create a new room
        try {
          const createRes = await createRoomApi({
            hostName: playerName,
            botCount: 0,
          });
          saveRoomSession(createRes.roomCode, createRes.hostPlayerId, createRes.sessionToken);
          setRoomCode(createRes.roomCode);
          setPlayerId(createRes.hostPlayerId);
          setSessionToken(createRes.sessionToken);

          // Update URL
          router.replace(`/lobby?room=${createRes.roomCode}`);
        } catch (err: unknown) {
          setInitError(err instanceof Error ? err.message : "Failed to create room");
        }
      }
    }

    initRoom();
  }, [urlRoomCode, urlPlayerName, router]);

  const { isConnected, roomInfo, lastError, addBot, removePlayer, startGame } =
    useGameSocket({
      roomCode,
      playerId,
      sessionToken,
      onGameStarted: () => {
        router.push(`/game?room=${roomCode}`);
      },
    });

  const handleCopyInvite = () => {
    if (typeof window !== "undefined") {
      const inviteUrl = `${window.location.origin}/lobby?room=${roomCode}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const isHost = roomInfo?.hostPlayerId === playerId;
  const seats = roomInfo?.seats || [];
  const maxSeats = roomInfo?.maxSeats || 5;
  const emptySeatCount = Math.max(0, maxSeats - seats.length);

  return (
    <AppShell active="lobby">
      <header className="app-header">
        <div>
          <p className="breadcrumb">
            ROOMS / <b>{roomCode || "CREATING..."}</b>
          </p>
          <h1>Game Lobby</h1>
        </div>
        <div className="header-actions">
          <div
            className={`hero-badge ${isConnected ? "hero-badge--online" : ""}`}
            style={{ padding: "6px 12px", borderRadius: "999px" }}
          >
            <span
              className="badge-dot"
              style={{ background: isConnected ? "#10b981" : "#f59e0b" }}
            />
            <span className="badge-text">
              {isConnected ? "Connected" : "Connecting..."}
            </span>
          </div>
        </div>
      </header>

      {initError && (
        <div
          style={{
            margin: "16px clamp(16px, 4vw, 32px)",
            padding: "12px 16px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid #ef4444",
            borderRadius: "8px",
            color: "#fca5a5",
          }}
        >
          {initError}
        </div>
      )}

      {lastError && (
        <div
          style={{
            margin: "16px clamp(16px, 4vw, 32px)",
            padding: "12px 16px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid #ef4444",
            borderRadius: "8px",
            color: "#fca5a5",
          }}
        >
          {lastError}
        </div>
      )}

      <main className="lobby-layout">
        <section className="lobby-main">
          <div className="room-intro">
            <div>
              <h2>Waiting for players to join...</h2>
              <p>Share the room code or invite link with friends to start.</p>
            </div>
            <span className="waiting-pill">
              <i /> {seats.length} / {maxSeats} Players
            </span>
          </div>

          <div className="player-grid">
            {seats.map((seat) => {
              const isYou = seat.playerId === playerId;
              const isSeatHost = seat.playerId === roomInfo?.hostPlayerId;

              return (
                <article
                  className={`player-seat ${isYou ? "player-seat--you" : ""}`}
                  key={seat.playerId}
                >
                  <span className={`avatar ${isYou ? "avatar--you" : seat.isBot ? "avatar--pink" : "avatar--blue"}`}>
                    {seat.name[0]?.toUpperCase() || "P"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <small style={{ color: isSeatHost ? "var(--primary)" : undefined }}>
                      {isSeatHost ? "HOST" : seat.isBot ? "BOT" : "PLAYER"}
                    </small>
                    <h3>{seat.name} {isYou && "(You)"}</h3>
                    <p>{seat.isConnected ? "Ready to deal" : "Reconnecting..."}</p>
                  </div>
                  {isHost && !isYou && (
                    <button
                      type="button"
                      onClick={() => removePlayer(seat.playerId)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--outline)",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                      title="Kick player"
                    >
                      ✕
                    </button>
                  )}
                </article>
              );
            })}

            {isHost && seats.length < maxSeats && (
              <button
                className="player-seat player-seat--add"
                type="button"
                onClick={addBot}
              >
                <span>＋</span>
                <b>Add bot</b>
                <small>Fill an open seat</small>
              </button>
            )}

            {Array.from({ length: Math.max(0, emptySeatCount - (isHost ? 1 : 0)) }).map((_, idx) => (
              <article className="player-seat player-seat--empty" key={`empty-${idx}`}>
                <span>＋</span>
                <p>Open Seat</p>
                <small>Waiting to join</small>
              </article>
            ))}
          </div>

          <section className="game-settings">
            <div className="panel-title">
              <div>
                <p className="eyebrow">TABLE SETTINGS</p>
                <h2>Rules & Timer</h2>
              </div>
            </div>
            <div className="setting-row">
              <div>
                <h3>Standard Monopoly Deal Rules</h3>
                <p>First player to complete 3 full property sets of different colors wins.</p>
              </div>
              <span style={{ color: "var(--primary)", fontWeight: 600 }}>Active</span>
            </div>
            <div className="setting-row">
              <div>
                <h3>Turn Limit</h3>
                <p>3 actions per turn (Draw 2 at start, max 7 cards in hand at end).</p>
              </div>
              <span style={{ color: "var(--primary)", fontWeight: 600 }}>Standard</span>
            </div>
          </section>
        </section>

        <aside className="lobby-side">
          <section className="room-code">
            <p className="eyebrow">ROOM CODE</p>
            <strong>{roomCode || "------"}</strong>
            <button type="button" onClick={handleCopyInvite}>
              {copyFeedback ? "✓ Copied Link!" : "▣ Copy invite"}
            </button>
            <p>Anyone with this code or link can join your game.</p>
          </section>

          <section className="lobby-log">
            <p className="eyebrow">ROOM INFO</p>
            <div>
              <span className="log-dot" />
              <p>
                <b>Room {roomCode} created</b>
                <small>{seats.length} player(s) present</small>
              </p>
            </div>
          </section>

          {isHost ? (
            <button
              className="button button--primary button--full"
              type="button"
              onClick={startGame}
              disabled={seats.length < 2}
              style={{
                opacity: seats.length < 2 ? 0.5 : 1,
                cursor: seats.length < 2 ? "not-allowed" : "pointer",
              }}
            >
              Start game <span>→</span>
            </button>
          ) : (
            <div style={{ textAlign: "center", color: "var(--on-surface-variant)", padding: "12px" }}>
              Waiting for host to start the game...
            </div>
          )}

          {seats.length < 2 && (
            <p className="start-hint">Add at least one more player or bot to begin.</p>
          )}
        </aside>
      </main>
    </AppShell>
  );
}
