"use client";

import { useState, use, useEffect, useRef } from "react";
import Link from "next/link";
import { Card } from "../_components/card";
import { GameOverSummary } from "../_components/game-over-summary";
import {
  getStoredProfile,
  getRoomSession,
} from "../../lib/session";
import { useGameClient } from "../../lib/use-game-client";
import type { CardColor } from "@dealopoly/shared";
import { COLOR_CONFIG } from "@dealopoly/shared";
import { type CardInstance, type PropertySet, calculateSetRent } from "@dealopoly/game-engine";

const OPPONENT_PALETTES = [
  { class: "avatar-theme--purple", badge: "🟣", hex: "#c084fc" },
  { class: "avatar-theme--orange", badge: "🟠", hex: "#fb923c" },
  { class: "avatar-theme--emerald", badge: "🟢", hex: "#34d399" },
  { class: "avatar-theme--amber", badge: "🟡", hex: "#fbbf24" },
];

export default function GamePage(props: {
  searchParams?: Promise<{ room?: string; mode?: string }>;
}) {
  const searchParams = props.searchParams ? use(props.searchParams) : undefined;
  const urlRoomCode = searchParams?.room;
  const isBotMode = searchParams?.mode === "bot" || !urlRoomCode || urlRoomCode === "solo";

  const profile = getStoredProfile();
  const session = urlRoomCode ? getRoomSession(urlRoomCode) : null;
  const playerId = session?.playerId || profile.id;
  const sessionToken = session?.token;

  const [selectedCard, setSelectedCard] = useState<CardInstance | null>(null);
  const [selectedWildRentColor, setSelectedWildRentColor] = useState<CardColor | null>(null);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [unreadActivityCount, setUnreadActivityCount] = useState(0);
  const [isDiscardInspectorOpen, setIsDiscardInspectorOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [liveReelEvent, setLiveReelEvent] = useState<{
    id: string;
    icon: string;
    title: string;
    description: string;
  } | null>(null);
  const lastSeenHistoryLengthRef = useRef(0);

  const [targetingAction, setTargetingAction] = useState<{
    card: CardInstance;
    type: "deal_breaker" | "sly_deal" | "forced_deal" | "debt_collector" | "wild_rent";
    doubleRentCardId?: string;
  } | null>(null);
  const [selectedForcedDealOfferedId, setSelectedForcedDealOfferedId] = useState<string | null>(null);
  const [paymentSelectedIds, setPaymentSelectedIds] = useState<string[]>([]);
  const [discardSelectedIds, setDiscardSelectedIds] = useState<string[]>([]);
  const [viewingOpponentId, setViewingOpponentId] = useState<string | null>(null);

  const {
    isLocal,
    isConnected,
    gameState,
    lastError,
    sendCommand,
    switchToLocalBotMode,
  } = useGameClient({
    roomCode: isBotMode ? "solo" : urlRoomCode,
    playerId,
    sessionToken,
    isLocalMode: isBotMode,
  });

  useEffect(() => {
    if (!gameState?.history || gameState.history.length === 0) return;
    const historyLen = gameState.history.length;

    if (historyLen > lastSeenHistoryLengthRef.current) {
      const newEvents = gameState.history.slice(lastSeenHistoryLengthRef.current);
      lastSeenHistoryLengthRef.current = historyLen;

      if (!isActivityDrawerOpen) {
        setUnreadActivityCount((prev) => prev + newEvents.length);
      }

      // Find latest high-impact event for the Action Reel
      const latestNotable = [...newEvents].reverse().find((evt) =>
        ["action_played", "rent_charged", "property_played", "game_won", "card_banked"].includes(evt.type)
      );

      if (latestNotable) {
        let icon = "bolt";
        let title = "ACTION PLAYED";

        if (latestNotable.type === "action_played") {
          const actionDefId = (latestNotable as unknown as { actionCard?: CardInstance }).actionCard?.defId;
          if (actionDefId === "action-deal-breaker") {
            icon = "gavel";
            title = "⚡ DEAL BREAKER!";
          } else if (actionDefId === "action-just-say-no") {
            icon = "shield";
            title = "🛡️ JUST SAY NO!";
          } else if (actionDefId === "action-forced-deal" || actionDefId === "action-force-deal") {
            icon = "swap_horiz";
            title = "🔄 FORCED DEAL";
          } else if (actionDefId === "action-sly-deal") {
            icon = "visibility";
            title = "🕵️ SLY DEAL";
          } else if (actionDefId === "action-debt-collector") {
            icon = "payments";
            title = "💵 DEBT COLLECTOR";
          } else if (actionDefId === "action-its-my-birthday") {
            icon = "cake";
            title = "🎂 IT'S MY BIRTHDAY!";
          } else if (actionDefId === "action-pass-go") {
            icon = "fast_forward";
            title = "🚀 PASS GO (+2 Cards)";
          }
        } else if (latestNotable.type === "rent_charged") {
          icon = "monetization_on";
          title = "💸 RENT COLLECTED";
        } else if (latestNotable.type === "property_played") {
          if ((latestNotable as unknown as { setCompleted?: boolean }).setCompleted) {
            icon = "star";
            title = "🎉 FULL SET COMPLETED!";
          } else {
            icon = "domain";
            title = "🏠 PROPERTY PLAYED";
          }
        } else if (latestNotable.type === "game_won") {
          icon = "emoji_events";
          title = "👑 VICTORY!";
        }

        setLiveReelEvent({
          id: latestNotable.id,
          icon,
          title,
          description: latestNotable.message,
        });

        const timer = setTimeout(() => {
          setLiveReelEvent(null);
        }, 2600);

        return () => clearTimeout(timer);
      }
    }
  }, [gameState?.history, isActivityDrawerOpen]);

  if (!gameState) {
    return (
      <div className="game-table-shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center" }}>
          <div
            className="badge-dot"
            style={{ width: "22px", height: "22px", background: "var(--primary)", animation: "pulse 1.5s infinite" }}
          />
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Connecting to Game Table...</h2>
          <p style={{ color: "var(--outline)", fontSize: "0.9rem" }}>
            Room: <b>{urlRoomCode || "Local Arena"}</b>
          </p>
          <button
            type="button"
            className="button button--primary"
            onClick={switchToLocalBotMode}
            style={{ marginTop: "12px" }}
          >
            🤖 Play Instant Bot Match
          </button>
        </div>
      </div>
    );
  }

  const you = gameState.players[playerId] || Object.values(gameState.players).find((p) => !p.isBot) || Object.values(gameState.players)[0];
  const actualPlayerId = you?.id || playerId;

  const handlePlayAgain = () => {
    if (isBotMode) {
      window.location.href = "/game?mode=bot";
    } else if (urlRoomCode) {
      window.location.href = `/lobby?room=${urlRoomCode}`;
    } else {
      window.location.href = "/lobby";
    }
  };

  if (gameState.status === "completed") {
    return (
      <GameOverSummary
        gameState={gameState}
        currentPlayerId={actualPlayerId}
        onPlayAgain={handlePlayAgain}
        roomCode={urlRoomCode}
      />
    );
  }

  const isYourTurn = gameState.turn.activePlayerId === actualPlayerId;
  const activePlayer = gameState.players[gameState.turn.activePlayerId];
  const pending = gameState.pendingResolution;

  const opponents = gameState.playerOrder
    .filter((id) => id !== actualPlayerId)
    .map((id) => gameState.players[id]!);

  // Actions
  const handleDraw = () => {
    if (!isYourTurn || gameState.turn.phase !== "draw") return;
    sendCommand({ type: "draw_cards", playerId: actualPlayerId });
  };

  const handleBankCard = (card: CardInstance) => {
    sendCommand({ type: "bank_card", playerId: actualPlayerId, cardInstanceId: card.instanceId });
    setSelectedCard(null);
  };

  const handlePlayProperty = (card: CardInstance, chosenColor?: CardColor, targetSetId?: string) => {
    sendCommand({
      type: "play_property",
      playerId: actualPlayerId,
      cardInstanceId: card.instanceId,
      chosenColor,
      targetSetId,
    });
    setSelectedCard(null);
  };

  const handlePlayAction = (
    card: CardInstance,
    targetPlayerId?: string,
    targetSetId?: string,
    targetCardInstanceId?: string,
    offeredCardInstanceId?: string,
  ) => {
    sendCommand({
      type: "play_action",
      playerId: actualPlayerId,
      cardInstanceId: card.instanceId,
      targetPlayerId,
      targetSetId,
      targetCardInstanceId,
      offeredCardInstanceId,
    });
    setSelectedCard(null);
    setTargetingAction(null);
    setSelectedForcedDealOfferedId(null);
  };

  const handlePlayRent = (
    card: CardInstance,
    chosenColor: CardColor,
    targetPlayerId?: string,
    doubleRentCardInstanceId?: string,
  ) => {
    sendCommand({
      type: "play_rent",
      playerId: actualPlayerId,
      rentCardInstanceId: card.instanceId,
      chosenColor,
      targetPlayerId,
      doubleRentCardInstanceId,
    });
    setSelectedCard(null);
    setTargetingAction(null);
    setSelectedWildRentColor(null);
  };

  const handleEndTurn = () => {
    sendCommand({ type: "end_turn", playerId: actualPlayerId });
    setSelectedCard(null);
  };

  const handleReaction = (action: "just_say_no" | "pass", jsnCardId?: string) => {
    sendCommand({
      type: "submit_reaction",
      playerId: actualPlayerId,
      action,
      justSayNoCardInstanceId: jsnCardId,
    });
  };

  const handlePaymentSubmit = () => {
    sendCommand({
      type: "submit_payment",
      playerId: actualPlayerId,
      paymentCardInstanceIds: paymentSelectedIds,
    });
    setPaymentSelectedIds([]);
  };

  const handleDiscardSubmit = () => {
    sendCommand({
      type: "discard_cards",
      playerId: actualPlayerId,
      cardInstanceIds: discardSelectedIds,
    });
    setDiscardSelectedIds([]);
  };

  return (
    <div className="game-table-shell">
      {/* Texture Noise Overlay */}
      <div className="texture-overlay" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }} />

      {/* Top App Bar */}
      <header className="game-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href="/" className="game-topbar-brand" aria-label="Dealopoly Home">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: "24px" }}>
              playing_cards
            </span>
            <span className="game-topbar-logo-text">dealopoly</span>
          </Link>

          {/* Turn & Action Pill */}
          <div className="game-turn-pill">
            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>
              timer
            </span>
            <span>
              {isYourTurn
                ? `${gameState.turn.actionsRemaining}/3 Actions`
                : `${activePlayer?.name}'s Turn`}
            </span>
          </div>
        </div>

        {/* Top bar actions */}
        <div className="game-topbar-actions">
          {/* Desktop links */}
          <div
            className="hero-badge game-desktop-only"
            style={{
              padding: "4px 10px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--outline-variant)",
            }}
          >
            <span className="badge-dot" style={{ background: isConnected ? "#10b981" : "#f59e0b" }} />
            <span className="badge-text" style={{ fontSize: "0.72rem" }}>
              {isLocal ? "🤖 Solo Match" : isConnected ? "Live Room" : "Connecting..."}
            </span>
          </div>

          <Link href="/cards" className="game-icon-btn game-desktop-only" title="Card Catalogue">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              menu_book
            </span>
          </Link>

          {/* Activity Drawer Toggle */}
          <button
            type="button"
            className="game-activity-toggle-btn"
            onClick={() => {
              setIsActivityDrawerOpen(true);
              setUnreadActivityCount(0);
            }}
            title="Match Activity"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              feed
            </span>
            <span className="game-desktop-only">Activity</span>
            {unreadActivityCount > 0 && (
              <span className="game-activity-unread-badge">{unreadActivityCount}</span>
            )}
          </button>

          <Link href="/cards" className="game-icon-btn game-desktop-only" title="Card Catalogue">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              menu_book
            </span>
          </Link>

          <Link href="/lobby" className="game-icon-btn game-desktop-only" title="Lobby">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              meeting_room
            </span>
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="game-icon-btn game-mobile-only"
            onClick={() => setIsMobileMenuOpen(true)}
            title="Menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              menu
            </span>
          </button>

          <div
            className="game-desktop-only avatar-theme--blue"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: "0.85rem",
              color: "#FFFFFF",
              border: "1.5px solid #60a5fa",
              boxShadow: "0 0 10px rgba(59, 130, 246, 0.4)",
            }}
            title={you?.name || "Player"}
          >
            {you?.name[0]?.toUpperCase() || "P"}
          </div>
        </div>
      </header>

      {/* Error Notification Bar */}
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

      {/* Main Layout Grid */}
      <div className="game-layout-grid">
        {/* Main Game Arena */}
        <main className="game-main-arena">
          {/* Opponents Seating Area */}
          <div className="game-opponents-strip">
            {opponents.map((opp, oppIdx) => {
              const completedCount = opp.propertySets.filter((s) => s.isComplete).length;
              const isOppActive = gameState.turn.activePlayerId === opp.id;
              const palette = OPPONENT_PALETTES[oppIdx % OPPONENT_PALETTES.length] || OPPONENT_PALETTES[0]!;

              return (
                <div
                  key={opp.id}
                  className={`game-opponent-seat ${isOppActive ? "game-opponent-seat--active" : ""}`}
                  onClick={() => setViewingOpponentId(opp.id)}
                  title={`View ${opp.name}'s Table`}
                >
                  <div className={`game-opponent-avatar-wrap ${palette.class}`}>
                    <span>{opp.name[0]?.toUpperCase()}</span>
                    <span className="game-opponent-hand-badge">🃏 {opp.handCount}</span>
                  </div>

                  <div className="game-opponent-info">
                    <div className="game-opponent-name-row">
                      <span className="game-opponent-name">{opp.name} {opp.isBot && "(Bot)"}</span>
                      {isOppActive && (
                        <span className="game-opponent-turn-tag">
                          THINKING...
                        </span>
                      )}
                    </div>

                    <div className="game-opponent-metrics">
                      <span className="game-opponent-bank-val">${opp.bankTotal}M</span>
                      <span style={{ color: "var(--primary)" }}>★ {completedCount}/3 Sets</span>
                    </div>

                    {/* Mini Property Sets Preview */}
                    <div className="game-opponent-sets-preview">
                      {opp.propertySets.map((s) => {
                        const colorHex = COLOR_CONFIG[s.color]?.hex || "#0055a4";
                        return (
                          <div
                            key={s.setId}
                            className={`game-opponent-set-chip ${s.isComplete ? "game-opponent-set-chip--complete" : ""}`}
                            style={{ backgroundColor: colorHex }}
                            title={`${s.color.toUpperCase()} (${s.cards.length}/${s.setSize})${s.isComplete ? " [Complete!]" : ""}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Central Table Center (Deck, Discard & Action Reel) */}
          <div className="game-center-stage">
            <div className="game-piles-wrapper">
              {/* 3D Stacked Draw Pile */}
              <div
                className="game-draw-pile"
                onClick={handleDraw}
                title={isYourTurn && gameState.turn.phase === "draw" ? "Click to Draw 2 Cards" : "Draw Pile"}
              >
                <div className="game-draw-card-layer" />
                <div className="game-draw-card-layer" />
                <div
                  className={`game-draw-card-top ${
                    isYourTurn && gameState.turn.phase === "draw" ? "game-draw-pile-pulse" : ""
                  }`}
                >
                  <span className="game-draw-title">
                    DEAL
                  </span>
                  <span className="game-draw-count-badge">{gameState.deckCount}</span>
                  <span className="game-draw-subtitle">
                    {isYourTurn && gameState.turn.phase === "draw" ? "TAP TO DRAW" : "CARDS"}
                  </span>
                </div>
              </div>

              {/* Discard Pile */}
              <div
                className="game-discard-pile"
                onClick={() => setIsDiscardInspectorOpen(true)}
                title="Tap to Inspect Discard Pile"
              >
                {gameState.discardPileTop ? (
                  <div className="game-discard-card-view">
                    <div
                      className="game-discard-card-header"
                      style={{
                        background:
                          COLOR_CONFIG[gameState.discardPileTop.currentColor || gameState.discardPileTop.primaryColor || "dark-blue"]?.hex ||
                          "#0055a4",
                      }}
                    >
                      {gameState.discardPileTop.type}
                    </div>
                    <div className="game-discard-card-body">
                      <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--primary)" }}>
                        {gameState.discardPileTop.icon || "layers"}
                      </span>
                      <b className="game-discard-card-name">
                        {gameState.discardPileTop.name}
                      </b>
                      <span className="game-discard-card-val">
                        ${gameState.discardPileTop.value}M
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="game-discard-empty">
                    <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "var(--outline)", opacity: 0.5 }}>
                      layers_clear
                    </span>
                    <span style={{ fontSize: "0.58rem", color: "var(--outline)", fontFamily: "var(--mono)", fontWeight: 700, letterSpacing: "0.04em" }}>
                      DISCARD
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Prompt Banner */}
            <div className="game-action-prompt-banner">
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                {isYourTurn ? "play_circle" : "hourglass_top"}
              </span>
              <span>
                {isYourTurn
                  ? gameState.turn.phase === "draw"
                    ? "✨ Your Turn: Draw 2 cards to begin ✨"
                    : `⚡ Your Turn: ${gameState.turn.actionsRemaining} action${gameState.turn.actionsRemaining === 1 ? "" : "s"} left`
                  : `${activePlayer?.name} is playing their turn...`}
              </span>
            </div>

            {/* Live Animated Action Reel (Positioned below Turn Prompt) */}
            {liveReelEvent && (
              <div className="game-action-reel">
                <div className="game-action-reel-icon-wrap">
                  <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: "20px" }}>
                    {liveReelEvent.icon}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                  <span style={{ fontSize: "0.72rem", color: "#66df75", fontWeight: 800, letterSpacing: "0.05em" }}>
                    {liveReelEvent.title}
                  </span>
                  <span className="game-action-reel-text">
                    {liveReelEvent.description}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Player Stage (Bank, Properties, Hand) */}
          <div className="game-player-table-stage">
            {/* Player Assets Row */}
            <div className="game-player-assets-row">
              {/* Bank Panel */}
              <div className="game-bank-panel">
                <div className="game-bank-header">
                  <span className="game-bank-title">YOUR BANK</span>
                  <span className="game-bank-count-pill">{you?.bank?.length || 0} cards</span>
                </div>

                <div className="game-bank-balance-display">
                  <span className="game-bank-total">${you?.bankTotal || 0}M</span>
                </div>

                <div className="game-bank-cards-fan">
                  {you?.bank?.length === 0 ? (
                    <span style={{ fontSize: "0.68rem", color: "var(--outline)", padding: "2px 0" }}>
                      No banked cash
                    </span>
                  ) : (
                    you?.bank.map((card) => (
                      <span key={card.instanceId} className="game-bank-card-mini">
                        {card.name} (${card.value}M)
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Properties Panel */}
              <div className="game-properties-panel">
                <div className="game-properties-header">
                  <div className="game-properties-title-group">
                    <span className="game-properties-title-label">
                      YOUR PROPERTIES
                    </span>
                    <span className="game-properties-completed-badge">
                      ★ {you?.propertySets.filter((s) => s.isComplete).length || 0} / 3 Sets
                    </span>
                  </div>
                </div>

                <div className="game-properties-sets-grid">
                  {you?.propertySets.length === 0 ? (
                    <span style={{ fontSize: "0.7rem", color: "var(--outline)", padding: "4px 0" }}>
                      No property sets laid down yet. Click a property card in hand to start a set.
                    </span>
                  ) : (
                    you?.propertySets.map((set) => {
                      const colorHex = COLOR_CONFIG[set.color]?.hex || "#0055a4";

                      return (
                        <div
                          key={set.setId}
                          className={`game-property-set-box ${set.isComplete ? "game-property-set-box--complete" : ""}`}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `2px solid ${colorHex}`, paddingBottom: "2px" }}>
                            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: colorHex, textTransform: "uppercase" }}>
                              {set.color}
                            </span>
                            <span style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", fontWeight: 700 }}>
                              {set.cards.length}/{set.setSize} {set.isComplete && "★"}
                            </span>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "0.64rem", color: "var(--muted)" }}>
                            {set.cards.map((c) => (
                              <span key={c.instanceId} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>
                                • {c.name}
                              </span>
                            ))}
                            {set.hasHouse && <span style={{ color: "#66df75", fontWeight: 700 }}>🏠 House (+$3M)</span>}
                            {set.hasHotel && <span style={{ color: "#ffb77d", fontWeight: 700 }}>🏨 Hotel (+$4M)</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* HUD Action Energy & Controls Bar */}
            <div className="game-hud-controls-bar">
              <div className="game-energy-indicator">
                <span>ACTION ENERGY:</span>
                <div className="game-energy-pips">
                  {[1, 2, 3].map((pipNum) => {
                    const isPipActive = isYourTurn && (gameState.turn.actionsRemaining >= pipNum);
                    return (
                      <div
                        key={pipNum}
                        className={`game-energy-pip ${isPipActive ? "game-energy-pip--active" : "game-energy-pip--spent"}`}
                        title={isPipActive ? `Action ${pipNum} Available` : `Action ${pipNum} Spent`}
                      />
                    );
                  })}
                </div>
                <span style={{ fontSize: "0.75rem", color: isYourTurn ? "var(--text)" : "var(--muted)" }}>
                  ({isYourTurn ? `${gameState.turn.actionsRemaining} left` : "Waiting for turn"})
                </span>
              </div>

              {isYourTurn && gameState.turn.phase === "action" && (
                <button
                  type="button"
                  onClick={handleEndTurn}
                  className={`game-end-turn-btn ${gameState.turn.actionsRemaining === 0 ? "game-end-turn-btn--pulse" : ""}`}
                >
                  <span>End Turn</span>
                  <span style={{ fontSize: "0.85em" }}>➔</span>
                </button>
              )}
            </div>

            {/* Fanned Player Hand */}
            <div className="game-hand-fanned-container">
              <div className="game-hand-cards-row">
                {you?.hand?.map((card, idx) => {
                  const isSelected = selectedCard?.instanceId === card.instanceId;

                  return (
                    <div
                      key={card.instanceId}
                      className={`game-hand-card-wrapper ${isSelected ? "game-hand-card-wrapper--selected" : ""}`}
                      style={{ zIndex: isSelected ? 50 : idx + 10 }}
                      onClick={() => {
                        if (isYourTurn && gameState.turn.phase === "action") {
                          setSelectedCard(isSelected ? null : card);
                        }
                      }}
                    >
                      <Card
                        card={{
                          id: card.defId,
                          name: card.name,
                          type: card.type,
                          primaryColor: card.primaryColor,
                          secondaryColor: card.secondaryColor,
                          value: card.value,
                          setSize: card.setSize,
                          description: card.description,
                          icon: card.icon,
                          count: 1,
                        }}
                        size="sm"
                        isInteractive={isYourTurn && gameState.turn.phase === "action"}
                      />

                      {/* Floating Action Menu on Selected Card */}
                      {isSelected && (
                        <div className="game-card-action-popover" onClick={(e) => e.stopPropagation()}>
                          {/* Property Card Actions */}
                          {card.type === "property" && (
                            <button
                              type="button"
                              className="game-popover-btn game-popover-btn--primary"
                              onClick={() => handlePlayProperty(card)}
                            >
                              🏠 Play to Set
                            </button>
                          )}

                          {/* Wild Property Card Actions */}
                          {card.type === "property-wild" && (
                            <>
                              {card.primaryColor !== "all" ? (
                                <>
                                  {(() => {
                                    const canPrimary = you?.propertySets.some(
                                      (s) => s.color === card.primaryColor && !s.isComplete
                                    );
                                    const canSecondary = you?.propertySets.some(
                                      (s) => s.color === card.secondaryColor && !s.isComplete
                                    );

                                    if (canPrimary || canSecondary) {
                                      return (
                                        <>
                                          {canPrimary && (
                                            <button
                                              type="button"
                                              className="game-popover-btn game-popover-btn--primary"
                                              onClick={() => handlePlayProperty(card, card.primaryColor)}
                                            >
                                              Play: {card.primaryColor?.toUpperCase()}
                                            </button>
                                          )}
                                          {canSecondary && (
                                            <button
                                              type="button"
                                              className="game-popover-btn game-popover-btn--primary"
                                              onClick={() => handlePlayProperty(card, card.secondaryColor)}
                                            >
                                              Play: {card.secondaryColor?.toUpperCase()}
                                            </button>
                                          )}
                                        </>
                                      );
                                    }

                                    return (
                                      <span style={{ fontSize: "0.62rem", color: "#fcd34d", textAlign: "center", padding: "2px" }}>
                                        ⚠️ Needs existing property
                                      </span>
                                    );
                                  })()}
                                </>
                              ) : (
                                <>
                                  {(() => {
                                    const eligibleSets = you?.propertySets.filter((s) => !s.isComplete) || [];
                                    if (eligibleSets.length > 0) {
                                      return (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                          <span style={{ fontSize: "0.62rem", color: "var(--muted)", fontWeight: 700, textAlign: "center" }}>
                                            Attach to Set:
                                          </span>
                                          {eligibleSets.map((s) => (
                                            <button
                                              key={s.setId}
                                              type="button"
                                              className="game-popover-btn game-popover-btn--primary"
                                              onClick={() => handlePlayProperty(card, s.color, s.setId)}
                                            >
                                              {s.color.toUpperCase()} ({s.cards.length}/{s.setSize})
                                            </button>
                                          ))}
                                        </div>
                                      );
                                    }

                                    return (
                                      <span style={{ fontSize: "0.62rem", color: "#fcd34d", textAlign: "center", padding: "2px" }}>
                                        ⚠️ Needs existing property
                                      </span>
                                    );
                                  })()}
                                </>
                              )}
                            </>
                          )}

                          {/* Bank Action (Any card with value > 0) */}
                          {card.value > 0 && (
                            <button
                              type="button"
                              className="game-popover-btn game-popover-btn--bank"
                              onClick={() => handleBankCard(card)}
                            >
                              💰 Deposit ${card.value}M
                            </button>
                          )}

                          {/* Action: Pass Go */}
                          {card.defId === "action-pass-go" && (
                            <button
                              type="button"
                              className="game-popover-btn game-popover-btn--primary"
                              onClick={() => handlePlayAction(card)}
                            >
                              ⚡ Draw 2 Cards
                            </button>
                          )}

                          {/* Action: Deal Breaker */}
                          {card.defId === "action-deal-breaker" && (
                            <button
                              type="button"
                              className="game-popover-btn game-popover-btn--primary"
                              onClick={() => setTargetingAction({ card, type: "deal_breaker" })}
                            >
                              👑 Steal Full Set
                            </button>
                          )}

                          {/* Action: Sly Deal */}
                          {card.defId === "action-sly-deal" && (
                            <button
                              type="button"
                              className="game-popover-btn game-popover-btn--primary"
                              onClick={() => setTargetingAction({ card, type: "sly_deal" })}
                            >
                              🤝 Steal 1 Property
                            </button>
                          )}

                          {/* Action: Forced Deal */}
                          {(card.defId === "action-forced-deal" || card.defId === "action-force-deal") && (
                            <button
                              type="button"
                              className="game-popover-btn game-popover-btn--primary"
                              onClick={() => setTargetingAction({ card, type: "forced_deal" })}
                            >
                              🔄 Swap Property
                            </button>
                          )}

                          {/* Action: Debt Collector */}
                          {card.defId === "action-debt-collector" && (
                            <button
                              type="button"
                              className="game-popover-btn game-popover-btn--primary"
                              onClick={() => setTargetingAction({ card, type: "debt_collector" })}
                            >
                              💵 Charge $5M
                            </button>
                          )}

                          {/* Action: Birthday */}
                          {card.defId === "action-its-my-birthday" && (
                            <button
                              type="button"
                              className="game-popover-btn game-popover-btn--primary"
                              onClick={() => handlePlayAction(card)}
                            >
                              🎂 Birthday ($2M All)
                            </button>
                          )}

                          {/* Action: Double The Rent */}
                          {card.defId === "action-double-the-rent" && (() => {
                            const rentCardsInHand = you?.hand?.filter((c) => c.type === "rent") || [];
                            const canDouble = gameState.turn.actionsRemaining >= 2;

                            if (rentCardsInHand.length === 0) {
                              return (
                                <span style={{ fontSize: "0.62rem", color: "var(--muted)", textAlign: "center", padding: "2px" }}>
                                  ℹ️ Play with a Rent card
                                </span>
                              );
                            }

                            if (!canDouble) {
                              return (
                                <span style={{ fontSize: "0.62rem", color: "#fcd34d", textAlign: "center", padding: "2px" }}>
                                  ⚠️ Needs 2 actions to double
                                </span>
                              );
                            }

                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                {rentCardsInHand.map((rCard) => {
                                  if (rCard.primaryColor === "all") {
                                    return (
                                      <button
                                        key={rCard.instanceId}
                                        type="button"
                                        className="game-popover-btn game-popover-btn--primary"
                                        style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)", color: "#FFFFFF" }}
                                        onClick={() => setTargetingAction({ card: rCard, type: "wild_rent", doubleRentCardId: card.instanceId })}
                                      >
                                        🔥 2x Wild Rent (1 Player)
                                      </button>
                                    );
                                  }

                                  return (
                                    <div key={rCard.instanceId} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                      {rCard.primaryColor && (
                                        <button
                                          type="button"
                                          className="game-popover-btn game-popover-btn--primary"
                                          style={{ background: COLOR_CONFIG[rCard.primaryColor as CardColor]?.hex || "var(--primary)", color: "#FFFFFF" }}
                                          onClick={() => handlePlayRent(rCard, rCard.primaryColor as CardColor, undefined, card.instanceId)}
                                        >
                                          🔥 2x {rCard.primaryColor.toUpperCase()}
                                        </button>
                                      )}
                                      {rCard.secondaryColor && (
                                        <button
                                          type="button"
                                          className="game-popover-btn game-popover-btn--primary"
                                          style={{ background: COLOR_CONFIG[rCard.secondaryColor as CardColor]?.hex || "var(--primary)", color: "#FFFFFF" }}
                                          onClick={() => handlePlayRent(rCard, rCard.secondaryColor as CardColor, undefined, card.instanceId)}
                                        >
                                          🔥 2x {rCard.secondaryColor.toUpperCase()}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* Action: House */}
                          {card.defId === "action-house" && (() => {
                            const eligibleSets = you?.propertySets.filter(
                              (s) => s.isComplete && !s.hasHouse && s.color !== "railroad" && s.color !== "utility"
                            ) || [];

                            if (eligibleSets.length > 0) {
                              return eligibleSets.map((set) => (
                                <button
                                  key={set.setId}
                                  type="button"
                                  className="game-popover-btn game-popover-btn--primary"
                                  onClick={() => handlePlayAction(card, undefined, set.setId)}
                                >
                                  🏠 House: {set.color.toUpperCase()}
                                </button>
                              ));
                            }
                            return (
                              <span style={{ fontSize: "0.62rem", color: "#fcd34d", textAlign: "center", padding: "2px" }}>
                                ⚠️ Needs full set
                              </span>
                            );
                          })()}

                          {/* Action: Hotel */}
                          {card.defId === "action-hotel" && (() => {
                            const eligibleSets = you?.propertySets.filter(
                              (s) => s.isComplete && s.hasHouse && !s.hasHotel
                            ) || [];

                            if (eligibleSets.length > 0) {
                              return eligibleSets.map((set) => (
                                <button
                                  key={set.setId}
                                  type="button"
                                  className="game-popover-btn game-popover-btn--primary"
                                  onClick={() => handlePlayAction(card, undefined, set.setId)}
                                >
                                  🏨 Hotel: {set.color.toUpperCase()}
                                </button>
                              ));
                            }
                            return (
                              <span style={{ fontSize: "0.62rem", color: "#fcd34d", textAlign: "center", padding: "2px" }}>
                                ⚠️ Needs House first
                              </span>
                            );
                          })()}

                          {/* Rent Card */}
                          {card.type === "rent" && (() => {
                            const doubleRentInHand = you?.hand?.find((c) => c.defId === "action-double-the-rent");
                            const canDouble = !!doubleRentInHand && gameState.turn.actionsRemaining >= 2;

                            return (
                              <>
                                {card.primaryColor !== "all" ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                    {card.primaryColor && (
                                      <button
                                        type="button"
                                        className="game-popover-btn game-popover-btn--primary"
                                        onClick={() => handlePlayRent(card, card.primaryColor as CardColor)}
                                      >
                                        Rent: {card.primaryColor.toUpperCase()}
                                      </button>
                                    )}
                                    {canDouble && doubleRentInHand && card.primaryColor && (
                                      <button
                                        type="button"
                                        className="game-popover-btn game-popover-btn--primary"
                                        style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)", color: "#FFFFFF" }}
                                        onClick={() => handlePlayRent(card, card.primaryColor as CardColor, undefined, doubleRentInHand.instanceId)}
                                      >
                                        🔥 2x {card.primaryColor.toUpperCase()} (2 Actions)
                                      </button>
                                    )}
                                    {card.secondaryColor && (
                                      <button
                                        type="button"
                                        className="game-popover-btn game-popover-btn--primary"
                                        onClick={() => handlePlayRent(card, card.secondaryColor as CardColor)}
                                      >
                                        Rent: {card.secondaryColor.toUpperCase()}
                                      </button>
                                    )}
                                    {canDouble && doubleRentInHand && card.secondaryColor && (
                                      <button
                                        type="button"
                                        className="game-popover-btn game-popover-btn--primary"
                                        style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)", color: "#FFFFFF" }}
                                        onClick={() => handlePlayRent(card, card.secondaryColor as CardColor, undefined, doubleRentInHand.instanceId)}
                                      >
                                        🔥 2x {card.secondaryColor.toUpperCase()} (2 Actions)
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                    <button
                                      type="button"
                                      className="game-popover-btn game-popover-btn--primary"
                                      onClick={() => setTargetingAction({ card, type: "wild_rent" })}
                                    >
                                      Wild Rent (1 Player)
                                    </button>
                                    {canDouble && doubleRentInHand && (
                                      <button
                                        type="button"
                                        className="game-popover-btn game-popover-btn--primary"
                                        style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)", color: "#FFFFFF" }}
                                        onClick={() => setTargetingAction({ card, type: "wild_rent", doubleRentCardId: doubleRentInHand.instanceId })}
                                      >
                                        🔥 2x Wild Rent (2 Actions)
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Target Selection Modal (For Sly Deal / Deal Breaker / Debt Collector) */}
      {targetingAction && (
        <div className="join-dialog-overlay" role="dialog" aria-modal="true">
          <div className="dialog-scrim" onClick={() => setTargetingAction(null)} />
          <div className="dialog-panel" style={{ padding: "24px", maxWidth: "480px" }}>
            <h2 style={{ color: "var(--primary)", marginBottom: "8px" }}>
              🎯 Select Target: {targetingAction.card.name}
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
              Choose an opponent or property to target with this action:
            </p>

            {/* Wild Rent Dedicated Flow: Color Selection + Opponent Selection */}
            {targetingAction.type === "wild_rent" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <p style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--primary)", marginBottom: "8px", letterSpacing: "0.05em" }}>
                    1. SELECT YOUR PROPERTY COLOR:
                  </p>
                  {(!you?.propertySets || you.propertySets.length === 0) ? (
                    <div
                      style={{
                        padding: "12px",
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid #ef4444",
                        borderRadius: "8px",
                        color: "#fca5a5",
                        fontSize: "0.8rem",
                      }}
                    >
                      ⚠️ You do not own any property sets on the table. You need at least 1 property card to collect rent.
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {you.propertySets.map((set) => {
                        const rentAmount = calculateSetRent(set);
                        const effectiveColor = selectedWildRentColor || you.propertySets[0]?.color;
                        const isSelected = effectiveColor === set.color;
                        const colorHex = COLOR_CONFIG[set.color]?.hex || "#0055a4";

                        return (
                          <button
                            key={set.setId}
                            type="button"
                            onClick={() => setSelectedWildRentColor(set.color)}
                            style={{
                              padding: "8px 12px",
                              borderRadius: "8px",
                              background: isSelected ? colorHex : "var(--surface)",
                              color: isSelected ? "#FFFFFF" : "var(--text)",
                              border: `2px solid ${isSelected ? "#FFFFFF" : colorHex}`,
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: "2px",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <b style={{ fontSize: "0.76rem", textTransform: "uppercase" }}>{set.color}</b>
                            <span style={{ fontSize: "0.68rem", opacity: 0.9 }}>
                              {set.cards.length}/{set.setSize} cards • <b>${rentAmount}M Rent</b>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {you && you.propertySets && you.propertySets.length > 0 && (() => {
                  const doubleRentInHand = you?.hand?.find((c) => c.defId === "action-double-the-rent");
                  const canDoubleWild = !!doubleRentInHand && gameState.turn.actionsRemaining >= 2;
                  const isDoubled = !!targetingAction.doubleRentCardId;

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {canDoubleWild && doubleRentInHand && (
                        <div
                          style={{
                            padding: "8px 12px",
                            background: isDoubled ? "rgba(245, 158, 11, 0.18)" : "rgba(255, 255, 255, 0.05)",
                            border: isDoubled ? "1px solid #f59e0b" : "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <span style={{ fontSize: "0.76rem", color: isDoubled ? "#fcd34d" : "var(--text)", fontWeight: 700, display: "block" }}>
                              🔥 Double The Rent (✖️2)
                            </span>
                            <small style={{ fontSize: "0.66rem", color: "var(--muted)" }}>
                              Uses 2 actions (Wild Rent + Double Rent)
                            </small>
                          </div>
                          <button
                            type="button"
                            className={`button ${isDoubled ? "button--primary" : "button--secondary"}`}
                            style={{
                              padding: "4px 12px",
                              fontSize: "0.72rem",
                              background: isDoubled ? "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)" : undefined,
                            }}
                            onClick={() => {
                              setTargetingAction({
                                ...targetingAction,
                                doubleRentCardId: isDoubled ? undefined : doubleRentInHand.instanceId,
                              });
                            }}
                          >
                            {isDoubled ? "✓ Activated" : "+ Add Double"}
                          </button>
                        </div>
                      )}

                      <div>
                        <p style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--primary)", marginBottom: "8px", letterSpacing: "0.05em" }}>
                          2. SELECT OPPONENT TO CHARGE:
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {opponents.map((opp) => {
                            const chosenColor = selectedWildRentColor || you.propertySets[0]?.color || "dark-blue";
                            const currentSet = you.propertySets.find((s) => s.color === chosenColor) || you.propertySets[0]!;
                            const rentVal = calculateSetRent(currentSet, isDoubled);

                            return (
                              <div
                                key={opp.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "10px 14px",
                                  background: "var(--surface)",
                                  borderRadius: "8px",
                                  border: "1px solid var(--outline-variant)",
                                }}
                              >
                                <div>
                                  <b>{opp.name} {opp.isBot && "(Bot)"}</b>
                                  <div style={{ fontSize: "0.7rem", color: "var(--outline)" }}>
                                    Bank: ${opp.bankTotal}M
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="button button--primary"
                                  style={{
                                    padding: "6px 14px",
                                    fontSize: "0.76rem",
                                    background: isDoubled ? "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)" : undefined,
                                    fontWeight: 800,
                                  }}
                                  onClick={() => handlePlayRent(targetingAction.card, chosenColor, opp.id, targetingAction.doubleRentCardId)}
                                >
                                  Charge ${rentVal}M Rent {isDoubled && "🔥"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : targetingAction.type === "forced_deal" ? (
              /* Forced Deal Flow: Step 1 (Pick your card to give) + Step 2 (Pick opponent & card to steal) */
              (() => {
                const yourIncompleteCards: Array<{ card: CardInstance; set: PropertySet }> = [];
                you?.propertySets
                  .filter((s) => !s.isComplete)
                  .forEach((s) => {
                    s.cards.forEach((c) => {
                      yourIncompleteCards.push({ card: c, set: s });
                    });
                    if (s.houseCard) yourIncompleteCards.push({ card: s.houseCard, set: s });
                    if (s.hotelCard) yourIncompleteCards.push({ card: s.hotelCard, set: s });
                  });

                const effectiveOfferedCardId =
                  selectedForcedDealOfferedId || yourIncompleteCards[0]?.card.instanceId || null;

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {/* 1. SELECT YOUR PROPERTY TO GIVE */}
                    <div>
                      <p style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--primary)", marginBottom: "8px", letterSpacing: "0.05em" }}>
                        1. SELECT YOUR PROPERTY CARD TO GIVE:
                      </p>

                      {yourIncompleteCards.length === 0 ? (
                        <div
                          style={{
                            padding: "10px 12px",
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid #ef4444",
                            borderRadius: "8px",
                            color: "#fca5a5",
                            fontSize: "0.78rem",
                          }}
                        >
                          ⚠️ You do not have any property cards in incomplete sets to trade. You need at least 1 property card to play Forced Deal.
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {yourIncompleteCards.map(({ card, set }) => {
                            const isSelected = effectiveOfferedCardId === card.instanceId;
                            const colorHex = COLOR_CONFIG[set.color as CardColor]?.hex || "#0055a4";

                            return (
                              <button
                                key={card.instanceId}
                                type="button"
                                onClick={() => setSelectedForcedDealOfferedId(card.instanceId)}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  background: isSelected ? colorHex : "var(--surface)",
                                  color: isSelected ? "#FFFFFF" : "var(--text)",
                                  border: `2px solid ${isSelected ? "#FFFFFF" : colorHex}`,
                                  boxShadow: isSelected ? `0 0 10px ${colorHex}` : "none",
                                  cursor: "pointer",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "flex-start",
                                  gap: "2px",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <b style={{ fontSize: "0.76rem" }}>{card.name}</b>
                                <span style={{ fontSize: "0.68rem", opacity: 0.9, textTransform: "uppercase" }}>
                                  {set.color} • ${card.value}M
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 2. SELECT OPPONENT & PROPERTY TO STEAL */}
                    {yourIncompleteCards.length > 0 && (
                      <div>
                        <p style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--primary)", marginBottom: "8px", letterSpacing: "0.05em" }}>
                          2. SELECT OPPONENT & PROPERTY CARD TO STEAL:
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {opponents.map((opp) => {
                            const oppIncompleteCards: Array<{ card: CardInstance; set: PropertySet }> = [];
                            opp.propertySets
                              .filter((s) => !s.isComplete)
                              .forEach((s) => {
                                s.cards.forEach((c) => {
                                  oppIncompleteCards.push({ card: c, set: s });
                                });
                                if (s.houseCard) oppIncompleteCards.push({ card: s.houseCard, set: s });
                                if (s.hotelCard) oppIncompleteCards.push({ card: s.hotelCard, set: s });
                              });

                            return (
                              <div
                                key={opp.id}
                                style={{
                                  padding: "10px 12px",
                                  background: "var(--surface)",
                                  borderRadius: "10px",
                                  border: "1px solid var(--outline-variant)",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                  <b>{opp.name} {opp.isBot && "(Bot)"}</b>
                                  <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                                    {oppIncompleteCards.length} tradeable card(s)
                                  </span>
                                </div>

                                {oppIncompleteCards.length === 0 ? (
                                  <span style={{ fontSize: "0.72rem", color: "var(--outline)", fontStyle: "italic" }}>
                                    No incomplete property cards available to swap.
                                  </span>
                                ) : (
                                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                    {oppIncompleteCards.map(({ card, set }) => {
                                      const colorHex = COLOR_CONFIG[set.color as CardColor]?.hex || "#0055a4";

                                      return (
                                        <button
                                          key={card.instanceId}
                                          type="button"
                                          className="button button--primary"
                                          style={{
                                            backgroundColor: colorHex,
                                            color: COLOR_CONFIG[set.color as CardColor]?.textHex || "#FFFFFF",
                                            padding: "6px 10px",
                                            fontSize: "0.75rem",
                                            fontWeight: 700,
                                            borderRadius: "7px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                          }}
                                          disabled={!effectiveOfferedCardId}
                                          onClick={() => {
                                            if (effectiveOfferedCardId) {
                                              handlePlayAction(
                                                targetingAction.card,
                                                opp.id,
                                                undefined,
                                                card.instanceId,
                                                effectiveOfferedCardId,
                                              );
                                            }
                                          }}
                                        >
                                          <span>Swap for {card.name}</span>
                                          <span style={{ fontSize: "0.68rem", opacity: 0.9 }}>(${card.value}M)</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : targetingAction.type === "sly_deal" ? (
              /* Sly Deal Flow: List all stealable cards from opponents' incomplete sets */
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {opponents.map((opp) => {
                  const oppIncompleteCards: Array<{ card: CardInstance; set: PropertySet }> = [];
                  opp.propertySets
                    .filter((s) => !s.isComplete)
                    .forEach((s) => {
                      s.cards.forEach((c) => {
                        oppIncompleteCards.push({ card: c, set: s });
                                });
                                if (s.houseCard) oppIncompleteCards.push({ card: s.houseCard, set: s });
                                if (s.hotelCard) oppIncompleteCards.push({ card: s.hotelCard, set: s });
                              });

                  return (
                    <div key={opp.id} style={{ padding: "12px", background: "var(--surface)", borderRadius: "10px", border: "1px solid var(--outline-variant)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <b>{opp.name} {opp.isBot && "(Bot)"}</b>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                          {oppIncompleteCards.length} stealable card(s)
                        </span>
                      </div>

                      {oppIncompleteCards.length === 0 ? (
                        <span style={{ fontSize: "0.72rem", color: "var(--outline)", fontStyle: "italic" }}>
                          No single property cards available to steal (opponent has no incomplete sets).
                        </span>
                      ) : (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {oppIncompleteCards.map(({ card, set }) => {
                            const colorHex = COLOR_CONFIG[set.color as CardColor]?.hex || "#0055a4";

                            return (
                              <button
                                key={card.instanceId}
                                type="button"
                                className="button button--primary"
                                style={{
                                  backgroundColor: colorHex,
                                  color: COLOR_CONFIG[set.color as CardColor]?.textHex || "#FFFFFF",
                                  padding: "6px 12px",
                                  fontSize: "0.76rem",
                                  fontWeight: 700,
                                  borderRadius: "8px",
                                }}
                                onClick={() => handlePlayAction(targetingAction.card, opp.id, undefined, card.instanceId)}
                              >
                                Steal {card.name} ({set.color.toUpperCase()})
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : targetingAction.type === "deal_breaker" ? (
              /* Deal Breaker Flow: Steal complete property sets */
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {opponents.map((opp) => {
                  const oppCompleteSets = opp.propertySets.filter((s) => s.isComplete);

                  return (
                    <div key={opp.id} style={{ padding: "12px", background: "var(--surface)", borderRadius: "10px", border: "1px solid var(--outline-variant)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <b>{opp.name} {opp.isBot && "(Bot)"}</b>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                          {oppCompleteSets.length} complete set(s)
                        </span>
                      </div>

                      {oppCompleteSets.length === 0 ? (
                        <span style={{ fontSize: "0.72rem", color: "var(--outline)", fontStyle: "italic" }}>
                          No complete property sets to steal.
                        </span>
                      ) : (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {oppCompleteSets.map((s) => {
                            const colorHex = COLOR_CONFIG[s.color as CardColor]?.hex || "#0055a4";

                            return (
                              <button
                                key={s.setId}
                                type="button"
                                className="button button--primary"
                                style={{
                                  backgroundColor: colorHex,
                                  color: COLOR_CONFIG[s.color as CardColor]?.textHex || "#FFFFFF",
                                  padding: "8px 14px",
                                  fontSize: "0.78rem",
                                  fontWeight: 800,
                                  borderRadius: "8px",
                                  boxShadow: "0 0 10px rgba(16, 185, 129, 0.4)",
                                }}
                                onClick={() => handlePlayAction(targetingAction.card, opp.id, s.setId)}
                              >
                                👑 Steal FULL {s.color.toUpperCase()} SET ({s.cards.length} cards)
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Debt Collector Flow */
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {opponents.map((opp) => (
                  <div key={opp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "var(--surface)", borderRadius: "10px", border: "1px solid var(--outline-variant)" }}>
                    <div>
                      <b>{opp.name} {opp.isBot && "(Bot)"}</b>
                      <div style={{ fontSize: "0.72rem", color: "var(--outline)" }}>
                        Bank: ${opp.bankTotal}M • Assets: ${opp.propertySets.reduce((sum, s) => sum + s.cards.reduce((cSum, c) => cSum + c.value, 0), 0)}M
                      </div>
                    </div>
                    <button
                      type="button"
                      className="button button--primary"
                      style={{ padding: "6px 14px", fontSize: "0.76rem" }}
                      onClick={() => handlePlayAction(targetingAction.card, opp.id)}
                    >
                      Charge $5M
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="button button--secondary button--full"
              style={{ marginTop: "16px" }}
              onClick={() => {
                setTargetingAction(null);
                setSelectedWildRentColor(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reaction Window Modal (Just Say No Prompt) */}
      {pending?.type === "reaction_window" && pending.waitingForPlayerId === actualPlayerId && (
        <div className="join-dialog-overlay" role="dialog" aria-modal="true">
          <div className="dialog-scrim" />
          <div className="dialog-panel" style={{ textAlign: "center", padding: "28px" }}>
            <h2 style={{ color: "#ef4444", marginBottom: "8px" }}>
              {pending.justSayNoChainCount > 0 ? "⚠️ ACTION BLOCKED!" : "⚠️ ACTION TARGETED YOU!"}
            </h2>
            <p style={{ marginBottom: "16px", color: "var(--on-surface-variant)", fontSize: "0.9rem" }}>
              {pending.justSayNoChainCount > 0
                ? `${gameState.players[pending.initiatorPlayerId === actualPlayerId ? pending.targetPlayerId : pending.initiatorPlayerId]?.name} played a Just Say No against your ${pending.actionCard.name}! Do you want to counter it with another Just Say No?`
                : `${pending.actionCard.name} was played against you. Do you want to block it?`}
            </p>

            {you?.hand?.some((c) => c.defId === "action-just-say-no") ? (
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button
                  type="button"
                  className="button button--primary"
                  style={{ background: "#10b981", borderColor: "#10b981" }}
                  onClick={() => {
                    const jsn = you.hand?.find((c) => c.defId === "action-just-say-no");
                    handleReaction("just_say_no", jsn?.instanceId);
                  }}
                >
                  PLAY JUST SAY NO!
                </button>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => handleReaction("pass")}
                >
                  Pass (Accept Action)
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "0.8rem", color: "var(--outline)", marginBottom: "14px" }}>
                  (You don't have a Just Say No card)
                </p>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => handleReaction("pass")}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Resolution Modal */}
      {pending?.type === "payment" && pending.debtorPlayerId === actualPlayerId && (
        <div className="join-dialog-overlay" role="dialog" aria-modal="true">
          <div className="dialog-scrim" />
          <div className="dialog-panel" style={{ padding: "24px", maxWidth: "520px" }}>
            <h2 style={{ color: "#f59e0b", marginBottom: "8px" }}>💳 Payment Required</h2>
            <p style={{ marginBottom: "16px", fontSize: "0.88rem" }}>
              {pending.reason} — You owe <b>${pending.amountDue}M</b> to {gameState.players[pending.creditorPlayerId]?.name}.
            </p>

            <p style={{ fontSize: "0.76rem", color: "var(--outline)", marginBottom: "8px" }}>
              Select table cards (Bank cash or Properties) to settle the bill:
            </p>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              {[...(you?.bank || []), ...(you?.propertySets.flatMap((s) => {
                  const items = [...s.cards];
                  if (s.houseCard) items.push(s.houseCard);
                  if (s.hotelCard) items.push(s.hotelCard);
                  return items;
                }) || [])]
                .filter(c => c.value > 0) // Exclude 0-value cards like 10-Color Wild
                .map((card) => {
                const isSelected = paymentSelectedIds.includes(card.instanceId);

                return (
                  <button
                    key={card.instanceId}
                    type="button"
                    onClick={() => {
                      setPaymentSelectedIds((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== card.instanceId)
                          : [...prev, card.instanceId],
                      );
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: isSelected ? "var(--primary)" : "var(--surface)",
                      color: isSelected ? "var(--on-primary)" : "inherit",
                      border: "1px solid var(--outline)",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    {card.name} (${card.value}M) {isSelected && "✓"}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="button button--primary button--full"
              onClick={handlePaymentSubmit}
            >
              Submit Payment
            </button>
          </div>
        </div>
      )}

      {/* Discard Resolution Modal */}
      {pending?.type === "discard" && pending.playerId === actualPlayerId && (
        <div className="join-dialog-overlay" role="dialog" aria-modal="true">
          <div className="dialog-scrim" />
          <div className="dialog-panel" style={{ padding: "24px", maxWidth: "520px" }}>
            <h2 style={{ color: "#ef4444", marginBottom: "8px" }}>🃏 Hand Limit Exceeded</h2>
            <p style={{ marginBottom: "16px", fontSize: "0.88rem" }}>
              You have {you?.hand?.length} cards. Please select <b>{pending.requiredDiscardCount}</b> card(s) to discard:
            </p>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              {you?.hand?.map((card) => {
                const isSelected = discardSelectedIds.includes(card.instanceId);

                return (
                  <button
                    key={card.instanceId}
                    type="button"
                    onClick={() => {
                      setDiscardSelectedIds((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== card.instanceId)
                          : [...prev, card.instanceId],
                      );
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: isSelected ? "#ef4444" : "var(--surface)",
                      color: isSelected ? "#ffffff" : "inherit",
                      border: "1px solid var(--outline)",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    {card.name} {isSelected && "✕"}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="button button--primary button--full"
              disabled={discardSelectedIds.length !== pending.requiredDiscardCount}
              onClick={handleDiscardSubmit}
              style={{
                opacity: discardSelectedIds.length !== pending.requiredDiscardCount ? 0.5 : 1,
              }}
            >
              Discard {discardSelectedIds.length} / {pending.requiredDiscardCount} Cards
            </button>
          </div>
        </div>
      )}

      {/* Mobile Navigation & Settings Drawer */}
      {isMobileMenuOpen && (
        <div className="game-activity-sheet" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="game-activity-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="game-activity-header" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--primary)" }}>
                  menu
                </span>
                <span>Game Menu</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="game-icon-btn"
                style={{ width: "28px", height: "28px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
              {/* Player Profile Box */}
              <div style={{ padding: "12px", background: "var(--surface-high)", borderRadius: "10px", border: "1px solid var(--outline-variant)", display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "var(--primary-deep)",
                    border: "1.5px solid var(--primary)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    color: "#FFFFFF",
                  }}
                >
                  {you?.name[0]?.toUpperCase() || "P"}
                </div>
                <div>
                  <b style={{ fontSize: "0.85rem", color: "var(--text)", display: "block" }}>{you?.name || "Player"}</b>
                  <span style={{ fontSize: "0.7rem", color: "var(--outline)" }}>
                    {isLocal ? "🤖 Solo Offline Match" : `Room ${urlRoomCode}`}
                  </span>
                </div>
              </div>

              {/* Navigation Links */}
              <Link
                href="/cards"
                className="button button--secondary button--full"
                style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px", fontSize: "0.82rem" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>menu_book</span>
                Card Catalogue
              </Link>

              <Link
                href="/lobby"
                className="button button--secondary button--full"
                style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px", fontSize: "0.82rem" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>meeting_room</span>
                Room Lobby
              </Link>

              <Link
                href="/"
                className="button button--secondary button--full"
                style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px", fontSize: "0.82rem" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>home</span>
                Exit to Home
              </Link>

              <button
                type="button"
                className="button button--primary button--full"
                style={{ marginTop: "auto" }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Return to Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Card Action Bottom Sheet */}
      {selectedCard && (
        <div className="game-card-mobile-modal" onClick={() => setSelectedCard(null)}>
          <div className="game-card-mobile-sheet" onClick={(e) => e.stopPropagation()}>
            {/* Header with close button */}
            <div className="game-mobile-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--primary)" }}>
                  playing_cards
                </span>
                <b style={{ fontSize: "0.92rem", color: "var(--text)" }}>Play Card</b>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                className="game-icon-btn"
                style={{ width: "30px", height: "30px" }}
              >
                ✕
              </button>
            </div>

            {/* Centered Full Card Preview */}
            <div className="game-card-modal-preview">
              <Card
                card={{
                  id: selectedCard.defId,
                  name: selectedCard.name,
                  type: selectedCard.type,
                  primaryColor: selectedCard.primaryColor,
                  secondaryColor: selectedCard.secondaryColor,
                  value: selectedCard.value,
                  setSize: selectedCard.setSize,
                  description: selectedCard.description,
                  icon: selectedCard.icon,
                  count: 1,
                }}
                size="sm"
                isInteractive={false}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Regular Property */}
              {selectedCard.type === "property" && (
                <button
                  type="button"
                  className="button button--primary button--full"
                  style={{ padding: "12px", fontSize: "0.9rem" }}
                  onClick={() => handlePlayProperty(selectedCard)}
                >
                  🏠 Play to Property Set
                </button>
              )}

              {/* Wild Property Dual Color */}
              {selectedCard.type === "property-wild" && selectedCard.primaryColor !== "all" && (() => {
                const canPrimary = you?.propertySets.some(
                  (s) => s.color === selectedCard.primaryColor && !s.isComplete
                );
                const canSecondary = you?.propertySets.some(
                  (s) => s.color === selectedCard.secondaryColor && !s.isComplete
                );

                if (canPrimary || canSecondary) {
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700 }}>
                        Attach to Existing Property Set:
                      </span>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {canPrimary && (
                          <button
                            type="button"
                            className="button button--primary"
                            style={{
                              background: COLOR_CONFIG[selectedCard.primaryColor!]?.hex || "var(--primary)",
                              color: COLOR_CONFIG[selectedCard.primaryColor!]?.textHex || "#FFFFFF",
                              padding: "12px 8px",
                              fontSize: "0.82rem",
                              fontWeight: 800,
                            }}
                            onClick={() => handlePlayProperty(selectedCard, selectedCard.primaryColor)}
                          >
                            Play as {selectedCard.primaryColor?.toUpperCase()}
                          </button>
                        )}
                        {canSecondary && (
                          <button
                            type="button"
                            className="button button--primary"
                            style={{
                              background: COLOR_CONFIG[selectedCard.secondaryColor!]?.hex || "var(--primary)",
                              color: COLOR_CONFIG[selectedCard.secondaryColor!]?.textHex || "#FFFFFF",
                              padding: "12px 8px",
                              fontSize: "0.82rem",
                              fontWeight: 800,
                            }}
                            onClick={() => handlePlayProperty(selectedCard, selectedCard.secondaryColor)}
                          >
                            Play as {selectedCard.secondaryColor?.toUpperCase()}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      color: "#fcd34d",
                      lineHeight: 1.3,
                    }}
                  >
                    ⚠️ Wild Property Cards must attach to an existing {selectedCard.primaryColor?.toUpperCase()} or {selectedCard.secondaryColor?.toUpperCase()} property set on your table. You can deposit it into your bank for ${selectedCard.value}M.
                  </div>
                );
              })()}

              {/* Wild Property Multicolor (All 10 Colors) */}
              {selectedCard.type === "property-wild" && selectedCard.primaryColor === "all" && (() => {
                const eligibleSets = you?.propertySets.filter((s) => !s.isComplete) || [];

                if (eligibleSets.length > 0) {
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700 }}>
                        Attach to Existing Incomplete Set:
                      </span>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        {eligibleSets.map((set) => (
                          <button
                            key={set.setId}
                            type="button"
                            className="button"
                            style={{
                              backgroundColor: COLOR_CONFIG[set.color]?.hex || "var(--surface-high)",
                              color: COLOR_CONFIG[set.color]?.textHex || "#FFFFFF",
                              padding: "10px 8px",
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              borderRadius: "8px",
                              textAlign: "center",
                              textTransform: "uppercase",
                            }}
                            onClick={() => handlePlayProperty(selectedCard, set.color, set.setId)}
                          >
                            {set.color.replace("-", " ")} ({set.cards.length}/{set.setSize})
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      color: "#fcd34d",
                      lineHeight: 1.3,
                    }}
                  >
                    ⚠️ Multicolor Wild Card must be attached to an existing incomplete property set on your table. You currently have no eligible sets.
                  </div>
                );
              })()}

              {/* Bank Action (Any card with value > 0) */}
              {selectedCard.value > 0 && (
                <button
                  type="button"
                  className="button button--full"
                  style={{
                    background: "rgba(39, 166, 68, 0.2)",
                    border: "1.5px solid #10b981",
                    color: "#86efac",
                    padding: "12px",
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  onClick={() => handleBankCard(selectedCard)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>savings</span>
                  💰 Deposit ${selectedCard.value}M into Bank
                </button>
              )}

              {/* Action: Pass Go */}
              {selectedCard.defId === "action-pass-go" && (
                <button
                  type="button"
                  className="button button--primary button--full"
                  style={{ padding: "12px", fontSize: "0.88rem" }}
                  onClick={() => handlePlayAction(selectedCard)}
                >
                  ⚡ Draw 2 Cards
                </button>
              )}

              {/* Action: Deal Breaker */}
              {selectedCard.defId === "action-deal-breaker" && (
                <button
                  type="button"
                  className="button button--primary button--full"
                  style={{ padding: "12px", fontSize: "0.88rem" }}
                  onClick={() => {
                    const cardToTarget = selectedCard;
                    setSelectedCard(null);
                    setTargetingAction({ card: cardToTarget, type: "deal_breaker" });
                  }}
                >
                  👑 Steal Full Set (Deal Breaker)
                </button>
              )}

              {/* Action: Sly Deal */}
              {selectedCard.defId === "action-sly-deal" && (
                <button
                  type="button"
                  className="button button--primary button--full"
                  style={{ padding: "12px", fontSize: "0.88rem" }}
                  onClick={() => {
                    const cardToTarget = selectedCard;
                    setSelectedCard(null);
                    setTargetingAction({ card: cardToTarget, type: "sly_deal" });
                  }}
                >
                  🤝 Steal 1 Property (Sly Deal)
                </button>
              )}

              {/* Action: Debt Collector */}
              {selectedCard.defId === "action-debt-collector" && (
                <button
                  type="button"
                  className="button button--primary button--full"
                  style={{ padding: "12px", fontSize: "0.88rem" }}
                  onClick={() => {
                    const cardToTarget = selectedCard;
                    setSelectedCard(null);
                    setTargetingAction({ card: cardToTarget, type: "debt_collector" });
                  }}
                >
                  💵 Charge $5M (Debt Collector)
                </button>
              )}

              {/* Action: Birthday */}
              {selectedCard.defId === "action-its-my-birthday" && (
                <button
                  type="button"
                  className="button button--primary button--full"
                  style={{ padding: "12px", fontSize: "0.88rem" }}
                  onClick={() => handlePlayAction(selectedCard)}
                >
                  🎂 It's My Birthday ($2M All)
                </button>
              )}

              {/* Action: Forced Deal */}
              {(selectedCard.defId === "action-forced-deal" || selectedCard.defId === "action-force-deal") && (
                <button
                  type="button"
                  className="button button--primary button--full"
                  style={{ padding: "12px", fontSize: "0.88rem" }}
                  onClick={() => {
                    const cardToTarget = selectedCard;
                    setSelectedCard(null);
                    setTargetingAction({ card: cardToTarget, type: "forced_deal" });
                  }}
                >
                  🔄 Swap Properties (Forced Deal)
                </button>
              )}

              {/* Action: House */}
              {selectedCard.defId === "action-house" && (() => {
                const eligibleSets = you?.propertySets.filter(
                  (s) => s.isComplete && !s.hasHouse && s.color !== "railroad" && s.color !== "utility"
                ) || [];

                if (eligibleSets.length > 0) {
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700 }}>
                        Select Complete Set to Add House:
                      </span>
                      {eligibleSets.map((set) => (
                        <button
                          key={set.setId}
                          type="button"
                          className="button button--primary button--full"
                          style={{
                            backgroundColor: COLOR_CONFIG[set.color]?.hex || "var(--primary)",
                            color: COLOR_CONFIG[set.color]?.textHex || "#FFFFFF",
                            padding: "10px 12px",
                            fontWeight: 800,
                            fontSize: "0.84rem",
                          }}
                          onClick={() => handlePlayAction(selectedCard, undefined, set.setId)}
                        >
                          🏠 Add House to {set.color.toUpperCase()} (+ $3M Rent)
                        </button>
                      ))}
                    </div>
                  );
                }

                return (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      color: "#fcd34d",
                      lineHeight: 1.3,
                    }}
                  >
                    ⚠️ You need a complete color property set (excluding Railroads and Utilities) to place a House. You can deposit it into your bank for $3M.
                  </div>
                );
              })()}

              {/* Action: Hotel */}
              {selectedCard.defId === "action-hotel" && (() => {
                const eligibleSets = you?.propertySets.filter(
                  (s) => s.isComplete && s.hasHouse && !s.hasHotel
                ) || [];

                if (eligibleSets.length > 0) {
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700 }}>
                        Select Set with House to Add Hotel:
                      </span>
                      {eligibleSets.map((set) => (
                        <button
                          key={set.setId}
                          type="button"
                          className="button button--primary button--full"
                          style={{
                            backgroundColor: COLOR_CONFIG[set.color]?.hex || "var(--primary)",
                            color: COLOR_CONFIG[set.color]?.textHex || "#FFFFFF",
                            padding: "10px 12px",
                            fontWeight: 800,
                            fontSize: "0.84rem",
                          }}
                          onClick={() => handlePlayAction(selectedCard, undefined, set.setId)}
                        >
                          🏨 Add Hotel to {set.color.toUpperCase()} (+ $4M Rent)
                        </button>
                      ))}
                    </div>
                  );
                }

                return (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      color: "#fcd34d",
                      lineHeight: 1.3,
                    }}
                  >
                    ⚠️ You need a complete property set with an existing House 🏠 to place a Hotel. You can deposit it into your bank for $4M.
                  </div>
                );
              })()}

              {/* Action: Double The Rent */}
              {selectedCard.defId === "action-double-the-rent" && (() => {
                const rentCardsInHand = you?.hand?.filter((c) => c.type === "rent") || [];
                const canDouble = gameState.turn.actionsRemaining >= 2;

                if (rentCardsInHand.length === 0) {
                  return (
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "rgba(168, 200, 255, 0.1)",
                        border: "1px solid rgba(168, 200, 255, 0.3)",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        color: "var(--primary)",
                        lineHeight: 1.3,
                      }}
                    >
                      ℹ️ Double The Rent must be played together with a Rent card to double the rent charged. You currently have no Rent cards in your hand. You can deposit it into your bank for $1M.
                    </div>
                  );
                }

                if (!canDouble) {
                  return (
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "rgba(245, 158, 11, 0.15)",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        color: "#fcd34d",
                        lineHeight: 1.3,
                      }}
                    >
                      ⚠️ Playing Double The Rent requires 2 available actions (1 for Rent + 1 for Double Rent). You only have {gameState.turn.actionsRemaining} action left this turn.
                    </div>
                  );
                }

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)" }}>
                      🔥 CHOOSE A RENT CARD TO DOUBLE (2 ACTIONS):
                    </span>
                    {rentCardsInHand.map((rCard) => {
                      if (rCard.primaryColor === "all") {
                        return (
                          <button
                            key={rCard.instanceId}
                            type="button"
                            className="button button--primary button--full"
                            style={{
                              background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
                              color: "#FFFFFF",
                              padding: "10px 12px",
                              fontSize: "0.82rem",
                              fontWeight: 800,
                            }}
                            onClick={() => {
                              const doubleCardId = selectedCard.instanceId;
                              setSelectedCard(null);
                              setSelectedWildRentColor(null);
                              setTargetingAction({ card: rCard, type: "wild_rent", doubleRentCardId: doubleCardId });
                            }}
                          >
                            🔥 2x Wild Rent (Target 1 Opponent)
                          </button>
                        );
                      }

                      return (
                        <div key={rCard.instanceId} style={{ display: "grid", gridTemplateColumns: rCard.secondaryColor ? "1fr 1fr" : "1fr", gap: "6px" }}>
                          {rCard.primaryColor && (
                            <button
                              type="button"
                              className="button button--primary"
                              style={{
                                background: COLOR_CONFIG[rCard.primaryColor as CardColor]?.hex || "var(--primary)",
                                color: "#FFFFFF",
                                padding: "10px 6px",
                                fontSize: "0.76rem",
                                fontWeight: 800,
                              }}
                              onClick={() => handlePlayRent(rCard, rCard.primaryColor as CardColor, undefined, selectedCard.instanceId)}
                            >
                              🔥 2x {rCard.primaryColor.toUpperCase()}
                            </button>
                          )}
                          {rCard.secondaryColor && (
                            <button
                              type="button"
                              className="button button--primary"
                              style={{
                                background: COLOR_CONFIG[rCard.secondaryColor as CardColor]?.hex || "var(--primary)",
                                color: "#FFFFFF",
                                padding: "10px 6px",
                                fontSize: "0.76rem",
                                fontWeight: 800,
                              }}
                              onClick={() => handlePlayRent(rCard, rCard.secondaryColor as CardColor, undefined, selectedCard.instanceId)}
                            >
                              🔥 2x {rCard.secondaryColor.toUpperCase()}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Rent Card */}
              {selectedCard.type === "rent" && (() => {
                const doubleRentInHand = you?.hand?.find((c) => c.defId === "action-double-the-rent");
                const canDouble = !!doubleRentInHand && gameState.turn.actionsRemaining >= 2;

                return (
                  <>
                    {selectedCard.primaryColor !== "all" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: selectedCard.secondaryColor ? "1fr 1fr" : "1fr", gap: "8px" }}>
                          {selectedCard.primaryColor && (
                            <button
                              type="button"
                              className="button button--primary"
                              style={{
                                background: COLOR_CONFIG[selectedCard.primaryColor as CardColor]?.hex || "var(--primary)",
                                color: "#FFFFFF",
                                padding: "10px 6px",
                                fontSize: "0.78rem",
                                fontWeight: 800,
                              }}
                              onClick={() => handlePlayRent(selectedCard, selectedCard.primaryColor as CardColor)}
                            >
                              💸 Rent: {selectedCard.primaryColor.toUpperCase()}
                            </button>
                          )}
                          {selectedCard.secondaryColor && (
                            <button
                              type="button"
                              className="button button--primary"
                              style={{
                                background: COLOR_CONFIG[selectedCard.secondaryColor as CardColor]?.hex || "var(--primary)",
                                color: "#FFFFFF",
                                padding: "10px 6px",
                                fontSize: "0.78rem",
                                fontWeight: 800,
                              }}
                              onClick={() => handlePlayRent(selectedCard, selectedCard.secondaryColor as CardColor)}
                            >
                              💸 Rent: {selectedCard.secondaryColor.toUpperCase()}
                            </button>
                          )}
                        </div>

                        {canDouble && doubleRentInHand && (
                          <div style={{ display: "grid", gridTemplateColumns: selectedCard.secondaryColor ? "1fr 1fr" : "1fr", gap: "8px" }}>
                            {selectedCard.primaryColor && (
                              <button
                                type="button"
                                className="button button--primary"
                                style={{
                                  background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
                                  color: "#FFFFFF",
                                  padding: "10px 6px",
                                  fontSize: "0.78rem",
                                  fontWeight: 800,
                                }}
                                onClick={() => handlePlayRent(selectedCard, selectedCard.primaryColor as CardColor, undefined, doubleRentInHand.instanceId)}
                              >
                                🔥 2x {selectedCard.primaryColor.toUpperCase()} (2 Actions)
                              </button>
                            )}
                            {selectedCard.secondaryColor && (
                              <button
                                type="button"
                                className="button button--primary"
                                style={{
                                  background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
                                  color: "#FFFFFF",
                                  padding: "10px 6px",
                                  fontSize: "0.78rem",
                                  fontWeight: 800,
                                }}
                                onClick={() => handlePlayRent(selectedCard, selectedCard.secondaryColor as CardColor, undefined, doubleRentInHand.instanceId)}
                              >
                                🔥 2x {selectedCard.secondaryColor.toUpperCase()} (2 Actions)
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <button
                          type="button"
                          className="button button--primary button--full"
                          style={{ padding: "12px", fontSize: "0.88rem" }}
                          onClick={() => {
                            const cardToTarget = selectedCard;
                            setSelectedWildRentColor(null);
                            setSelectedCard(null);
                            setTargetingAction({ card: cardToTarget, type: "wild_rent" });
                          }}
                        >
                          🎯 Charge Wild Rent (1 Opponent)
                        </button>
                        {canDouble && doubleRentInHand && (
                          <button
                            type="button"
                            className="button button--primary button--full"
                            style={{
                              background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
                              color: "#FFFFFF",
                              padding: "12px",
                              fontSize: "0.88rem",
                              fontWeight: 800,
                            }}
                            onClick={() => {
                              const cardToTarget = selectedCard;
                              const doubleCardId = doubleRentInHand.instanceId;
                              setSelectedWildRentColor(null);
                              setSelectedCard(null);
                              setTargetingAction({ card: cardToTarget, type: "wild_rent", doubleRentCardId: doubleCardId });
                            }}
                          >
                            🔥 2x Wild Rent (1 Opponent) (2 Actions)
                          </button>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              <button
                type="button"
                className="button button--secondary button--full"
                style={{ marginTop: "4px" }}
                onClick={() => setSelectedCard(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Opponent Table View Modal */}
      {viewingOpponentId && (() => {
        const opp = opponents.find(o => o.id === viewingOpponentId);
        if (!opp) return null;

        return (
          <div className="join-dialog-overlay" role="dialog" aria-modal="true" style={{ zIndex: 300 }}>
            <div className="dialog-scrim" onClick={() => setViewingOpponentId(null)} />
            <div className="dialog-panel" style={{ padding: "16px", maxWidth: "900px", width: "95%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--outline-variant)", paddingBottom: "12px" }}>
                <div>
                  <h2 style={{ fontSize: "1.1rem", marginBottom: "4px" }}>{opp.name}&apos;s Table</h2>
                  <div className="game-opponent-metrics" style={{ fontSize: "0.8rem" }}>
                    <span>{opp.handCount} Cards in Hand (Hidden)</span>
                    <span>•</span>
                    <span style={{ color: "#66df75" }}>Bank: ${opp.bankTotal}M</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingOpponentId(null)}
                  style={{ background: "none", border: "none", color: "var(--outline)", cursor: "pointer" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>close</span>
                </button>
              </div>

              {/* Exact replica of bottom table layout but for opponent */}
              <div className="game-player-assets-row" style={{ minHeight: "220px" }}>
                {/* Bank Panel */}
                <div className="game-bank-panel">
                  <div className="game-bank-header">
                    <span className="game-bank-title">BANK</span>
                    <span className="game-bank-count-pill">{opp.bank.length} cards</span>
                  </div>

                  <div className="game-bank-balance-display">
                    <span className="game-bank-total">${opp.bankTotal}M</span>
                  </div>

                  <div className="game-bank-cards-fan" style={{ flexWrap: "wrap", justifyContent: "center" }}>
                    {opp.bank.length === 0 ? (
                      <span style={{ fontSize: "0.68rem", color: "var(--outline)", padding: "2px 0" }}>
                        No banked cash
                      </span>
                    ) : (
                      opp.bank.map((card) => (
                        <span key={card.instanceId} className="game-bank-card-mini">
                          {card.name} (${card.value}M)
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Properties Panel */}
                <div className="game-properties-panel">
                  <div className="game-properties-header">
                    <div className="game-properties-title-group">
                      <span className="game-properties-title-label">
                        PROPERTIES
                      </span>
                      <span className="game-properties-completed-badge">
                        ★ {opp.propertySets.filter((s) => s.isComplete).length} / 3 Sets
                      </span>
                    </div>
                  </div>

                  <div className="game-properties-sets-grid">
                    {opp.propertySets.length === 0 ? (
                      <span style={{ fontSize: "0.7rem", color: "var(--outline)", padding: "4px 0" }}>
                        No property sets laid down yet.
                      </span>
                    ) : (
                      opp.propertySets.map((set) => {
                        const colorHex = COLOR_CONFIG[set.color]?.hex || "#0055a4";

                        return (
                          <div
                            key={set.setId}
                            className={`game-property-set-box ${set.isComplete ? "game-property-set-box--complete" : ""}`}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `2px solid ${colorHex}`, paddingBottom: "2px" }}>
                              <span style={{ fontSize: "0.68rem", fontWeight: 800, color: colorHex, textTransform: "uppercase" }}>
                                {set.color}
                              </span>
                              <span style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", fontWeight: 700 }}>
                                {set.cards.length}/{set.setSize} {set.isComplete && "★"}
                              </span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "0.64rem", color: "var(--muted)" }}>
                              {set.cards.map((c) => (
                                <span key={c.instanceId} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>
                                  • {c.name}
                                </span>
                              ))}
                              {set.hasHouse && <span style={{ color: "#66df75", fontWeight: 700 }}>🏠 House (+$3M)</span>}
                              {set.hasHotel && <span style={{ color: "#ffb77d", fontWeight: 700 }}>🏨 Hotel (+$4M)</span>}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Slide-out Activity Drawer */}
      {isActivityDrawerOpen && (
        <div className="game-activity-drawer-backdrop" onClick={() => setIsActivityDrawerOpen(false)}>
          <aside className="game-activity-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="game-activity-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--primary)" }}>
                  feed
                </span>
                <span>Match Activity</span>
              </div>
              <button
                type="button"
                className="game-icon-btn"
                onClick={() => setIsActivityDrawerOpen(false)}
                title="Close Drawer"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  close
                </span>
              </button>
            </div>

            <ul className="game-activity-list">
              {gameState.history.length === 0 ? (
                <li style={{ color: "var(--outline)", fontSize: "0.78rem", textAlign: "center", padding: "30px 10px" }}>
                  Game started. Turn events will appear here in real-time.
                </li>
              ) : (
                [...gameState.history].reverse().map((evt) => {
                  let bulletColor = "var(--primary)";
                  if (evt.type === "game_won") bulletColor = "#ffd700";
                  else if (evt.type === "rent_charged" || evt.type === "card_banked") bulletColor = "#66df75";
                  else if (evt.type === "action_played") bulletColor = "#ffb77d";
                  else if (evt.type === "cards_drawn") bulletColor = "#a8c8ff";

                  return (
                    <li key={evt.id} className="game-activity-item">
                      <span
                        className="game-activity-bullet"
                        style={{ backgroundColor: bulletColor }}
                      />
                      <div style={{ flex: 1 }}>
                        <span style={{ color: "var(--text)" }}>{evt.message}</span>
                        <div style={{ fontSize: "0.68rem", color: "var(--outline)", marginTop: "2px", fontFamily: "var(--mono)" }}>
                          {new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>
        </div>
      )}

      {/* Discard Pile Inspector Modal */}
      {isDiscardInspectorOpen && (
        <div className="discard-inspector-modal" onClick={() => setIsDiscardInspectorOpen(false)}>
          <div className="discard-inspector-box" onClick={(e) => e.stopPropagation()}>
            <div className="discard-inspector-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: "22px" }}>
                  layers
                </span>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>
                  Discard Pile ({gameState.discardPile?.length || (gameState.discardPileTop ? 1 : 0)} Cards)
                </h3>
              </div>
              <button
                type="button"
                className="game-icon-btn"
                onClick={() => setIsDiscardInspectorOpen(false)}
                title="Close"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  close
                </span>
              </button>
            </div>

            <div className="discard-inspector-grid">
              {gameState.discardPile && gameState.discardPile.length > 0 ? (
                [...gameState.discardPile].reverse().map((c, i) => (
                  <div key={`${c.instanceId}-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <Card
                      card={{
                        id: c.defId,
                        name: c.name,
                        type: c.type,
                        primaryColor: c.primaryColor,
                        secondaryColor: c.secondaryColor,
                        value: c.value,
                        setSize: c.setSize,
                        description: c.description,
                        icon: c.icon,
                        count: 1,
                      }}
                      size="xs"
                      isInteractive={false}
                    />
                    <span style={{ fontSize: "0.64rem", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                      {i === 0 ? "Top Card" : `#${gameState.discardPile!.length - i}`}
                    </span>
                  </div>
                ))
              ) : gameState.discardPileTop ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <Card
                    card={{
                      id: gameState.discardPileTop.defId,
                      name: gameState.discardPileTop.name,
                      type: gameState.discardPileTop.type,
                      primaryColor: gameState.discardPileTop.primaryColor,
                      secondaryColor: gameState.discardPileTop.secondaryColor,
                      value: gameState.discardPileTop.value,
                      setSize: gameState.discardPileTop.setSize,
                      description: gameState.discardPileTop.description,
                      icon: gameState.discardPileTop.icon,
                      count: 1,
                    }}
                    size="xs"
                    isInteractive={false}
                  />
                  <span style={{ fontSize: "0.64rem", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                    Top Card
                  </span>
                </div>
              ) : (
                <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>
                  Discard pile is currently empty.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
