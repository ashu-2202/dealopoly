"use client";

import { useState, use, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardBack } from "../_components/card";
import { CardLoader } from "../_components/card-loader";
import { GameOverSummary } from "../_components/game-over-summary";
import { UserNav } from "../_components/user-nav";
import { LeastCountGameView } from "../_components/least-count-game-view";
import {
  getStoredProfile,
  getRoomSession,
} from "../../lib/session";
import { useGameClient } from "../../lib/use-game-client";
import type { CardColor, CardDefinition } from "@dealopoly/shared";
import { COLOR_CONFIG, CARD_CATALOGUE } from "@dealopoly/shared";
import { type CardInstance, type PropertySet, calculateSetRent } from "@dealopoly/game-engine";

const CARD_MAP = new Map<string, CardDefinition>(CARD_CATALOGUE.map((c) => [c.id, c]));

function resolveCardDef(card: CardInstance | CardDefinition | { defId?: string; id?: string } | null | undefined): CardDefinition {
  if (!card) {
    return CARD_CATALOGUE[0]!;
  }
  const defId = "defId" in card && card.defId ? card.defId : "id" in card && card.id ? card.id : "";
  const fromCatalogue = CARD_MAP.get(defId);
  if (fromCatalogue) {
    return fromCatalogue;
  }
  return card as unknown as CardDefinition;
}

const OPPONENT_PALETTES = [
  { class: "avatar-theme--purple", badge: "🟣", hex: "#c084fc" },
  { class: "avatar-theme--orange", badge: "🟠", hex: "#fb923c" },
  { class: "avatar-theme--emerald", badge: "🟢", hex: "#34d399" },
  { class: "avatar-theme--amber", badge: "🟡", hex: "#fbbf24" },
];

export default function GamePage(props: {
  searchParams?: Promise<{
    room?: string;
    game?: string;
    mode?: string;
    bots?: string;
    difficulty?: "easy" | "medium" | "hard";
    player?: string;
    name?: string;
  }>;
}) {
  const searchParams = props.searchParams ? use(props.searchParams) : undefined;
  const gameType = searchParams?.game || "monodeal";
  const urlRoomCode = searchParams?.room;
  const urlPlayerId = searchParams?.player;
  const isBotMode = searchParams?.mode === "bot" || !urlRoomCode || urlRoomCode === "solo";
  const botCount = searchParams?.bots ? parseInt(searchParams.bots, 10) : undefined;
  const botDifficulty = searchParams?.difficulty;
  const customPlayerName = searchParams?.name; // 'player' is now ID, 'name' is name if needed

  const { data: authSession } = useSession();
  const profile = getStoredProfile();
  const session = urlRoomCode ? getRoomSession(urlRoomCode, urlPlayerId) : null;
  const playerId = session?.playerId || urlPlayerId || profile.id;
  const sessionToken = session?.token;

  if (gameType === "least_count") {
    return (
      <LeastCountGameView
        roomCode={urlRoomCode}
        isBotMode={isBotMode}
        botCount={botCount}
        playerName={customPlayerName}
        playerId={playerId}
      />
    );
  }

  const [selectedCard, setSelectedCard] = useState<CardInstance | null>(null);
  const [selectedWildRentColor, setSelectedWildRentColor] = useState<CardColor | null>(null);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [unreadActivityCount, setUnreadActivityCount] = useState(0);
  const [isDiscardInspectorOpen, setIsDiscardInspectorOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
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
  const [reorganizeTarget, setReorganizeTarget] = useState<{
    card: CardInstance;
    fromSet: PropertySet;
  } | null>(null);
  const [moveBuildingTarget, setMoveBuildingTarget] = useState<{
    buildingType: "house" | "hotel";
    fromSet: PropertySet;
  } | null>(null);
  const [stolenAlert, setStolenAlert] = useState<{
    id: string;
    attackerName: string;
    actionName: string;
    actionDefId: string;
    actionCard?: CardInstance;
    stolenCards: CardInstance[];
    swappedCard?: CardInstance;
    type: "deal_breaker" | "sly_deal" | "forced_deal";
  } | null>(null);
  const [viewingOpponentId, setViewingOpponentId] = useState<string | null>(null);
  const [viewingBankPlayerId, setViewingBankPlayerId] = useState<string | null>(null);

  // Card Draw Flight Animation State
  const [flyingCards, setFlyingCards] = useState<
    Array<{
      id: string;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      delay: number;
      rotate: number;
    }>
  >([]);
  const drawPileRef = useRef<HTMLDivElement>(null);
  const handContainerRef = useRef<HTMLDivElement>(null);
  const prevHandCountRef = useRef<number>(0);
  const isAnimatingDrawRef = useRef<boolean>(false);

  const {
    isLocal,
    isConnected,
    gameState,
    roomInfo,
    lastError,
    sendCommand,
    switchToLocalBotMode,
  } = useGameClient({
    roomCode: isBotMode ? "solo" : urlRoomCode,
    playerId,
    sessionToken,
    isLocalMode: isBotMode,
    botCount,
    botDifficulty,
    playerName: customPlayerName,
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
      }

      // Check for targeted steal actions where the local player (actualPlayerId) is the victim
      for (const evt of newEvents) {
        if (evt.type === "action_played" || evt.type === "action_resolved") {
          const actionEvt = evt as unknown as {
            playerId?: string;
            initiatorPlayerId?: string;
            targetPlayerId?: string;
            actionCard?: CardInstance;
            stolenCards?: CardInstance[];
            swappedCard?: CardInstance;
          };

          const targetPlayerId = actionEvt.targetPlayerId;
          const attackerId = actionEvt.playerId || actionEvt.initiatorPlayerId;

          // Only trigger alert if the local player is the target/victim and not the initiator
          if (targetPlayerId === actualPlayerId && attackerId && attackerId !== actualPlayerId) {
            const defId = actionEvt.actionCard?.defId;
            if (
              defId === "action-deal-breaker" ||
              defId === "action-sly-deal" ||
              defId === "action-forced-deal" ||
              defId === "action-force-deal"
            ) {
              const isPendingReaction = gameState?.pendingResolution?.type === "reaction_window";
              // If reaction window is open, the player sees the reaction prompt first.
              // Pop up the stolen notification if no reaction window is active or after action resolves.
              if (evt.type === "action_resolved" || !isPendingReaction) {
                const attackerName = gameState.players[attackerId]?.name || "Opponent";
                const actionType =
                  defId === "action-deal-breaker"
                    ? "deal_breaker"
                    : defId === "action-sly-deal"
                    ? "sly_deal"
                    : "forced_deal";

                const actionName =
                  actionType === "deal_breaker"
                    ? "Deal Breaker"
                    : actionType === "sly_deal"
                    ? "Sly Deal"
                    : "Forced Deal";

                setStolenAlert({
                  id: evt.id,
                  attackerName,
                  actionName,
                  actionDefId: defId,
                  actionCard: actionEvt.actionCard,
                  stolenCards: actionEvt.stolenCards || [],
                  swappedCard: actionEvt.swappedCard,
                  type: actionType,
                });
              }
            }
          }
        }
      }
    }
  }, [gameState?.history, gameState?.pendingResolution, isActivityDrawerOpen, actualPlayerId, gameState?.players]);

  // Auto-dismiss liveReelEvent after 1 second
  useEffect(() => {
    if (!liveReelEvent) return;
    const timer = setTimeout(() => {
      setLiveReelEvent(null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [liveReelEvent]);

  const you = gameState?.players?.[playerId] || (gameState?.players ? Object.values(gameState.players).find((p) => !p.isBot) || Object.values(gameState.players)[0] : undefined);
  const actualPlayerId = you?.id || playerId;
  const isYourTurn = gameState?.turn?.activePlayerId === actualPlayerId;

  const triggerDrawAnimation = (count: number = 2) => {
    if (!drawPileRef.current || !handContainerRef.current) return;
    const drawRect = drawPileRef.current.getBoundingClientRect();
    const handRect = handContainerRef.current.getBoundingClientRect();

    const startX = drawRect.left + (drawRect.width - 84) / 2;
    const startY = drawRect.top + (drawRect.height - 122) / 2;

    const targetCenterX = handRect.left + handRect.width / 2 - 42;
    const targetCenterY = handRect.top + 16;

    const newCards: Array<{
      id: string;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      delay: number;
      rotate: number;
    }> = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const spreadOffset = (i - (count - 1) / 2) * 36;
      const endX = targetCenterX + spreadOffset;
      const endY = targetCenterY;
      const rotate = (i - (count - 1) / 2) * 9;

      newCards.push({
        id: `fly-${now}-${i}-${Math.random()}`,
        startX,
        startY,
        endX,
        endY,
        delay: i * 0.15,
        rotate,
      });
    }

    isAnimatingDrawRef.current = true;
    setFlyingCards((prev) => [...prev, ...newCards]);
  };

  // Watch for hand draws (e.g. Turn start, Pass Go, empty hand draw 5) - MUST BE BEFORE ANY EARLY RETURNS
  useEffect(() => {
    const currentHandCount = you?.hand?.length || 0;
    const prevCount = prevHandCountRef.current;
    prevHandCountRef.current = currentHandCount;

    if (prevCount > 0 && currentHandCount > prevCount && isYourTurn) {
      const drawnCount = currentHandCount - prevCount;
      if (!isAnimatingDrawRef.current) {
        triggerDrawAnimation(Math.min(drawnCount, 5));
      }
    }
  }, [you?.hand?.length, isYourTurn]);

  // Automatically end turn when player has played all 3 actions and no pending resolution is in flight
  useEffect(() => {
    if (!gameState || gameState.status !== "in_progress") return;

    const isCurrentActive = isYourTurn && gameState.turn?.activePlayerId === actualPlayerId;
    const isActionPhase = gameState.turn?.phase === "action";
    const allActionsUsed = gameState.turn?.actionsRemaining === 0;
    const noPendingAction = !gameState.pendingResolution;

    if (isCurrentActive && isActionPhase && allActionsUsed && noPendingAction) {
      const timer = setTimeout(() => {
        if (
          gameState.status === "in_progress" &&
          gameState.turn?.activePlayerId === actualPlayerId &&
          gameState.turn?.phase === "action" &&
          gameState.turn?.actionsRemaining === 0 &&
          !gameState.pendingResolution
        ) {
          sendCommand({ type: "end_turn", playerId: actualPlayerId });
          setSelectedCard(null);
        }
      }, 550);

      return () => clearTimeout(timer);
    }
  }, [
    gameState?.status,
    gameState?.turn?.activePlayerId,
    gameState?.turn?.phase,
    gameState?.turn?.actionsRemaining,
    gameState?.pendingResolution,
    isYourTurn,
    actualPlayerId,
    sendCommand,
  ]);

  if (!gameState) {
    return (
      <div className="game-table-shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center" }}>
          <CardLoader size="lg" text="Connecting to Game Table..." />
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

  const handlePlayAgain = () => {
    if (isBotMode) {
      window.location.href = "/game?mode=bot";
    } else if (urlRoomCode) {
      window.location.href = `/lobby?room=${urlRoomCode}`;
    } else {
      window.location.href = "/lobby";
    }
  };

  const handleExitGame = () => {
    if (!isBotMode) {
      sendCommand({ type: "LEAVE_GAME", playerId: actualPlayerId } as any);
      window.location.href = "/lobby";
    } else {
      window.location.href = "/";
    }
  };

  if (gameState.status === "completed") {
    return (
      <GameOverSummary
        gameState={gameState}
        currentPlayerId={actualPlayerId}
        onPlayAgain={handlePlayAgain}
        roomCode={urlRoomCode}
        isBotMode={isBotMode}
      />
    );
  }

  const activePlayer = gameState.players[gameState.turn.activePlayerId];
  const pending = gameState.pendingResolution;

  const opponents = gameState.playerOrder
    .filter((id) => id !== actualPlayerId)
    .map((id) => gameState.players[id]!);

  // Actions
  const handleDraw = () => {
    if (!isYourTurn || gameState.turn.phase !== "draw" || gameState.pendingResolution) return;
    triggerDrawAnimation(2);
    sendCommand({ type: "draw_cards", playerId: actualPlayerId });
  };

  const handleBankCard = (card: CardInstance) => {
    if (gameState.pendingResolution) return;
    sendCommand({ type: "bank_card", playerId: actualPlayerId, cardInstanceId: card.instanceId });
    setSelectedCard(null);
  };

  const handlePlayProperty = (card: CardInstance, chosenColor?: CardColor, targetSetId?: string) => {
    if (gameState.pendingResolution) return;
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
    if (gameState.pendingResolution) return;
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
    if (gameState.pendingResolution) return;
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
    if (gameState.pendingResolution) return;
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
          <Link href="/" className="game-topbar-brand" aria-label="Dealopoly" style={{ textDecoration: "none" }}>
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
          {/* Match Status Pill */}
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

          {/* Red Leave Game Button */}
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
              const palette = OPPONENT_PALETTES[oppIdx % OPPONENT_PALETTES.length] || OPPONENT_PALETTES[0]!;
              const isOppActive = gameState.turn.activePlayerId === opp.id;
              const completedCount = opp.propertySets.filter((s) => s.isComplete).length;
              const oppSeat = roomInfo?.seats?.find((s: any) => s.playerId === opp.id);
              const isOffline = !opp.isBot && oppSeat && oppSeat.isConnected === false;

              return (
                <div
                  key={opp.id}
                  className={`game-opponent-seat ${isOppActive ? "game-opponent-seat--active" : ""} ${isOffline ? "game-opponent-seat--offline" : ""}`}
                  onClick={() => setViewingOpponentId(opp.id)}
                  title={`View ${opp.name}'s Table`}
                >
                  <div className={`game-opponent-avatar-wrap ${palette.class}`}>
                    <span>{opp.name[0]?.toUpperCase()}</span>
                    <span className="game-opponent-hand-badge">🃏 {opp.handCount}</span>
                    {isOffline && (
                       <div style={{ position: "absolute", top: -2, right: -2, background: "#ef4444", borderRadius: "50%", width: 12, height: 12, border: "2px solid var(--surface)" }} title="Offline" />
                    )}
                  </div>

                  <div className="game-opponent-info">
                    <div className="game-opponent-name-row">
                      <span className="game-opponent-name">
                        {opp.name} {opp.isBot && "(Bot)"}
                        {isOffline && <span style={{ color: "#ef4444", fontSize: "0.7rem", marginLeft: "6px", fontWeight: "bold" }}>OFFLINE</span>}
                      </span>
                      {isOppActive && !isOffline && (
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
                ref={drawPileRef}
                className="game-draw-pile"
                onClick={handleDraw}
                title={isYourTurn && gameState.turn.phase === "draw" && !gameState.pendingResolution ? "Click to Draw 2 Cards" : "Draw Pile"}
              >
                <div className="game-draw-card-layer" />
                <div className="game-draw-card-layer" />
                <div
                  className={`game-draw-card-top ${
                    isYourTurn && gameState.turn.phase === "draw" && !gameState.pendingResolution ? "game-draw-pile-pulse" : ""
                  }`}
                >
                  <span className="game-draw-title">
                    DEAL
                  </span>
                  <span className="game-draw-count-badge">{gameState.deckCount}</span>
                  <span className="game-draw-subtitle">
                    {isYourTurn && gameState.turn.phase === "draw" && !gameState.pendingResolution ? "TAP TO DRAW" : "CARDS"}
                  </span>
                </div>
              </div>

              {/* Discard Pile with stacked authentic cards */}
              <div
                className="game-discard-pile"
                onClick={() => setIsDiscardInspectorOpen(true)}
                title="Tap to Inspect Discard Pile"
              >
                {gameState.discardPileTop ? (
                  <div className="game-discard-stack-wrapper">
                    {/* Layer 1 (bottom card in stack if 3+ cards) */}
                    {(gameState.discardPile?.length ?? 1) >= 3 && (
                      <div className="game-discard-layer game-discard-layer--bottom" />
                    )}
                    {/* Layer 2 (middle card in stack if 2+ cards) */}
                    {(gameState.discardPile?.length ?? 1) >= 2 && (
                      <div className="game-discard-layer game-discard-layer--middle" />
                    )}
                    {/* Top Card rendered as authentic pure CSS Card */}
                    <div className="game-discard-top-card">
                      <Card
                        card={resolveCardDef(gameState.discardPileTop)}
                        size="xs"
                        isInteractive={false}
                      />
                    </div>
                    {/* Discard count badge */}
                    <div className="game-discard-count-badge">
                      <span>{gameState.discardPile?.length || 1}</span>
                    </div>
                  </div>
                ) : (
                  <div className="game-discard-empty">
                    <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "var(--outline)", opacity: 0.5 }}>
                      layers_clear
                    </span>
                    <span style={{ fontSize: "0.58rem", color: "var(--outline)", fontFamily: "var(--mono)", fontWeight: 700, letterSpacing: "0.04em" }}>
                      DISCARD PILE
                    </span>
                    <span style={{ fontSize: "0.52rem", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                      (0 Cards)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Prompt Banner */}
            <div className="game-action-prompt-banner">
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                {gameState.pendingResolution
                  ? "hourglass_top"
                  : isYourTurn
                    ? "play_circle"
                    : "hourglass_top"}
              </span>
              <span>
                {gameState.pendingResolution
                  ? gameState.pendingResolution.type === "payment"
                    ? `⏳ Waiting for ${gameState.players[gameState.pendingResolution.debtorPlayerId]?.name || "player"} to pay $${gameState.pendingResolution.amountDue}M rent...`
                    : gameState.pendingResolution.type === "reaction_window"
                      ? `⏳ Waiting for ${gameState.players[gameState.pendingResolution.waitingForPlayerId]?.name || "player"} to respond...`
                      : `⏳ Waiting for ${gameState.players[gameState.pendingResolution.playerId]?.name || "player"} to discard cards...`
                  : isYourTurn
                    ? gameState.turn.phase === "draw"
                      ? "✨ Your Turn: Draw 2 cards to begin ✨"
                      : gameState.turn.actionsRemaining === 0
                        ? "⚡ All 3 actions played! Ending turn..."
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
              {/* Bank Panel (Fixed Size & Clickable) */}
              <div
                className="game-bank-panel"
                onClick={() => setViewingBankPlayerId(actualPlayerId)}
                role="button"
                tabIndex={0}
                aria-label="View banked cash cards"
                title="Click to view bank vault"
              >
                <div className="game-bank-header">
                  <span className="game-bank-title">YOUR BANK</span>
                  <span className="game-bank-count-pill">{you?.bank?.length || 0} cards</span>
                </div>

                <div className="game-bank-balance-display">
                  <span className="game-bank-total">${you?.bankTotal || 0}M</span>
                </div>

                <div className="game-bank-view-btn">
                  <span>View cards</span>
                  <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>
                    open_in_new
                  </span>
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

                          <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "0.64rem", color: "var(--muted)" }}>
                            {set.cards.map((c) => {
                              const isWild = c.type === "property-wild";
                              const canReorganize =
                                isYourTurn &&
                                gameState.turn.phase === "action" &&
                                !gameState.pendingResolution &&
                                isWild;

                              return (
                                <div
                                  key={c.instanceId}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "4px",
                                  }}
                                >
                                  <span
                                    style={{
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      maxWidth: canReorganize ? "85px" : "120px",
                                      color: isWild ? "var(--primary)" : "inherit",
                                      fontWeight: isWild ? 700 : 400,
                                    }}
                                  >
                                    • {c.name}
                                  </span>
                                  {canReorganize && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReorganizeTarget({ card: c, fromSet: set });
                                      }}
                                      className="game-wild-switch-btn"
                                      title="Switch Wildcard Color (Free Action)"
                                    >
                                      <span>🔄</span>
                                      <span>Move</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {set.hasHouse && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  fontSize: "0.75rem",
                                  gap: "4px",
                                }}
                              >
                                <span style={{ color: "#66df75", fontWeight: 700 }}>🏠 House (+$3M)</span>
                                {isYourTurn && gameState.turn.phase === "action" && !gameState.pendingResolution && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMoveBuildingTarget({ buildingType: "house", fromSet: set });
                                    }}
                                    className="game-wild-switch-btn"
                                    title="Move House to another completed set (Free Action)"
                                    style={{ padding: "2px 6px", fontSize: "0.68rem" }}
                                  >
                                    <span>🔄</span>
                                    <span>Move</span>
                                  </button>
                                )}
                              </div>
                            )}
                            {set.hasHotel && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  fontSize: "0.75rem",
                                  gap: "4px",
                                }}
                              >
                                <span style={{ color: "#ffb77d", fontWeight: 700 }}>🏨 Hotel (+$4M)</span>
                                {isYourTurn && gameState.turn.phase === "action" && !gameState.pendingResolution && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMoveBuildingTarget({ buildingType: "hotel", fromSet: set });
                                    }}
                                    className="game-wild-switch-btn"
                                    title="Move Hotel to another completed set (Free Action)"
                                    style={{ padding: "2px 6px", fontSize: "0.68rem" }}
                                  >
                                    <span>🔄</span>
                                    <span>Move</span>
                                  </button>
                                )}
                              </div>
                            )}
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

              {isYourTurn && gameState.turn.phase === "action" && !gameState.pendingResolution && (
                <button
                  type="button"
                  onClick={handleEndTurn}
                  className={`game-end-turn-btn ${gameState.turn.actionsRemaining === 0 ? "game-end-turn-btn--pulse" : ""}`}
                >
                  <span>{gameState.turn.actionsRemaining === 0 ? "Ending Turn..." : "End Turn"}</span>
                  <span style={{ fontSize: "0.85em" }}>➔</span>
                </button>
              )}
            </div>

            {/* Fanned Player Hand */}
            <div ref={handContainerRef} className="game-hand-fanned-container">
              <div className="game-hand-cards-row">
                {you?.hand?.map((card, idx) => {
                  const isSelected = selectedCard?.instanceId === card.instanceId;
                  const isHandInteractive = isYourTurn && gameState.turn.phase === "action" && !gameState.pendingResolution;

                  return (
                    <div
                      key={card.instanceId}
                      className={`game-hand-card-wrapper ${isSelected ? "game-hand-card-wrapper--selected" : ""}`}
                      style={{ zIndex: isSelected ? 50 : idx + 10 }}
                      onClick={() => {
                        if (isHandInteractive) {
                          setSelectedCard(isSelected ? null : card);
                        }
                      }}
                    >
                      <Card
                        card={resolveCardDef(card)}
                        size="sm"
                        isInteractive={isHandInteractive}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Target Selection Modal (For Sly Deal / Deal Breaker / Debt Collector / Forced Deal / Wild Rent) */}
      {targetingAction && (
        <div className="join-dialog-overlay" role="dialog" aria-modal="true">
          <div
            className="dialog-scrim"
            onClick={() => {
              setTargetingAction(null);
              setSelectedWildRentColor(null);
            }}
          />
          <div className="dialog-panel dialog-panel--wide">
            <div className="texture-overlay" />
            <div className="sheet-handle" />

            {/* Sticky Header */}
            <div className="dialog-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "24px", color: "var(--primary)" }}
                >
                  {targetingAction.type === "deal_breaker"
                    ? "gavel"
                    : targetingAction.type === "forced_deal"
                    ? "published_with_changes"
                    : targetingAction.type === "sly_deal"
                    ? "swap_horiz"
                    : targetingAction.type === "debt_collector"
                    ? "payments"
                    : "local_atm"}
                </span>
                <div>
                  <h2 style={{ color: "var(--primary)", fontSize: "1.15rem", margin: 0 }}>
                    Select Target: {targetingAction.card.name}
                  </h2>
                  <p style={{ color: "var(--muted)", fontSize: "0.74rem", margin: "2px 0 0" }}>
                    Choose properties or opponents to target with this action
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="dialog-close-btn"
                onClick={() => {
                  setTargetingAction(null);
                  setSelectedWildRentColor(null);
                }}
                aria-label="Close dialog"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  close
                </span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="dialog-body">
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
            </div>

            {/* Sticky Footer */}
            <div className="dialog-footer">
              <button
                type="button"
                className="button button--secondary button--full"
                onClick={() => {
                  setTargetingAction(null);
                  setSelectedWildRentColor(null);
                }}
              >
                Cancel Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reaction Window Modal (Just Say No Prompt) */}
      {pending?.type === "reaction_window" && pending.waitingForPlayerId === actualPlayerId && (
        <div className="join-dialog-overlay" role="dialog" aria-modal="true">
          <div className="dialog-scrim" />
          <div className="dialog-panel" style={{ maxWidth: "480px" }}>
            <div className="texture-overlay" />
            <div className="sheet-handle" />

            <div className="dialog-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ color: "#ef4444", fontSize: "24px" }}>
                  warning
                </span>
                <h2 style={{ color: "#ef4444", fontSize: "1.15rem", margin: 0 }}>
                  {pending.justSayNoChainCount > 0 ? "Action Blocked!" : "Action Targeted You!"}
                </h2>
              </div>
            </div>

            <div className="dialog-body" style={{ textAlign: "center", padding: "20px 24px" }}>
              <p style={{ margin: 0, color: "var(--on-surface-variant)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                {pending.justSayNoChainCount > 0
                  ? `${gameState.players[pending.initiatorPlayerId === actualPlayerId ? pending.targetPlayerId : pending.initiatorPlayerId]?.name} played a Just Say No against your ${pending.actionCard.name}! Do you want to counter it with another Just Say No?`
                  : `${pending.actionCard.name} was played against you. Do you want to block it?`}
              </p>

              {you?.hand?.some((c) => c.defId === "action-just-say-no") ? (
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "12px" }}>
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
                <div style={{ marginTop: "12px" }}>
                  <p style={{ fontSize: "0.8rem", color: "var(--outline)", marginBottom: "12px" }}>
                    (You don&apos;t have a Just Say No card)
                  </p>
                  <button
                    type="button"
                    className="button button--secondary button--full"
                    onClick={() => handleReaction("pass")}
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Resolution Modal */}
      {pending?.type === "payment" && pending.debtorPlayerId === actualPlayerId && (() => {
        const payableCards = [
          ...(you?.bank || []).map((c) => ({
            ...c,
            source: "bank" as const,
            color: undefined as CardColor | undefined,
            isHouse: false,
            isHotel: false,
          })),
          ...(you?.propertySets.flatMap((s) => {
            const items = s.cards.map((c) => ({
              ...c,
              source: "property" as const,
              color: s.color as CardColor,
              isHouse: false,
              isHotel: false,
            }));
            if (s.houseCard) {
              items.push({
                ...s.houseCard,
                source: "property" as const,
                color: s.color as CardColor,
                isHouse: true,
                isHotel: false,
              });
            }
            if (s.hotelCard) {
              items.push({
                ...s.hotelCard,
                source: "property" as const,
                color: s.color as CardColor,
                isHouse: false,
                isHotel: true,
              });
            }
            return items;
          }) || []),
        ].filter((c) => c.value > 0);

        const totalTableValue = payableCards.reduce((sum, c) => sum + c.value, 0);

        const selectedCards = payableCards.filter((c) =>
          paymentSelectedIds.includes(c.instanceId),
        );
        const totalSelected = selectedCards.reduce((sum, c) => sum + c.value, 0);
        const remainingDue = Math.max(0, pending.amountDue - totalSelected);
        const isGoalReached = totalSelected >= pending.amountDue;
        const isInsufficientTotal = totalTableValue < pending.amountDue;
        const isAllSelected = selectedCards.length === payableCards.length;
        const canSubmit = isGoalReached || (isInsufficientTotal && isAllSelected);

        return (
          <div className="join-dialog-overlay" role="dialog" aria-modal="true">
            <div className="dialog-scrim" />
            <div className="dialog-panel dialog-panel--wide">
              <div className="texture-overlay" />
              <div className="sheet-handle" />

              {/* Header */}
              <div className="dialog-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="material-symbols-outlined" style={{ color: "#f59e0b", fontSize: "24px" }}>
                    payments
                  </span>
                  <div>
                    <h2 style={{ color: "#f59e0b", fontSize: "1.15rem", margin: 0 }}>Payment Required</h2>
                    <p style={{ color: "var(--muted)", fontSize: "0.74rem", margin: "2px 0 0" }}>
                      Settle debt owed to {gameState.players[pending.creditorPlayerId]?.name || "opponent"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="dialog-body" style={{ gap: "14px" }}>
                {/* Reason Banner */}
                <div style={{ padding: "10px 14px", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "10px" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text)" }}>
                    {pending.reason} — Total Owed: <b style={{ color: "#f59e0b" }}>${pending.amountDue}M</b>
                  </p>
                </div>

                {/* Live Amount Breakdown Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "8px",
                    background: "var(--surface-lowest)",
                    padding: "10px",
                    borderRadius: "10px",
                    border: "1px solid rgba(66, 71, 81, 0.4)",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "0.66rem", color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--mono)", fontWeight: 700, display: "block" }}>
                      Total Due
                    </span>
                    <strong style={{ fontSize: "1.1rem", color: "#f59e0b", fontFamily: "var(--display)" }}>
                      ${pending.amountDue}M
                    </strong>
                  </div>

                  <div style={{ textAlign: "center", borderLeft: "1px solid rgba(255, 255, 255, 0.1)", borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                    <span style={{ fontSize: "0.66rem", color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--mono)", fontWeight: 700, display: "block" }}>
                      Selected
                    </span>
                    <strong style={{ fontSize: "1.1rem", color: isGoalReached ? "#66df75" : "var(--primary)", fontFamily: "var(--display)" }}>
                      ${totalSelected}M
                    </strong>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "0.66rem", color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--mono)", fontWeight: 700, display: "block" }}>
                      Remaining
                    </span>
                    <strong style={{ fontSize: "1.1rem", color: remainingDue === 0 ? "#66df75" : "#ff7d7d", fontFamily: "var(--display)" }}>
                      {remainingDue === 0 ? "$0M ✓" : `$${remainingDue}M`}
                    </strong>
                  </div>
                </div>

                {/* Status Indicator Notice */}
                {isGoalReached ? (
                  <div style={{ padding: "8px 12px", background: "rgba(102, 223, 117, 0.15)", border: "1px solid #66df75", borderRadius: "8px", color: "#86efac", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span>
                    <span><b>Debt Covered (${totalSelected}M of ${pending.amountDue}M)</b> — Remaining cards locked to prevent overpayment.</span>
                  </div>
                ) : isInsufficientTotal ? (
                  <div style={{ padding: "8px 12px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: "8px", color: "#fca5a5", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>info</span>
                    <span>Total assets (${totalTableValue}M) are less than debt. You must surrender all {payableCards.length} cards.</span>
                  </div>
                ) : (
                  <div style={{ padding: "8px 12px", background: "rgba(168, 200, 255, 0.08)", border: "1px solid rgba(168, 200, 255, 0.2)", borderRadius: "8px", color: "#a8c8ff", fontSize: "0.78rem" }}>
                    Select cards totaling at least <b>${remainingDue}M</b> more to pay the debt.
                  </div>
                )}

                {/* Cards List */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--mono)", fontWeight: 700 }}>
                      Available Table Cards ({payableCards.length})
                    </span>
                    {isInsufficientTotal && !isAllSelected && (
                      <button
                        type="button"
                        onClick={() => setPaymentSelectedIds(payableCards.map(c => c.instanceId))}
                        style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                      >
                        Select All Assets
                      </button>
                    )}
                  </div>

                  {payableCards.length === 0 ? (
                    <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: "0.82rem" }}>
                      You have no cards or cash on your table to pay this debt.
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {payableCards.map((card) => {
                        const isSelected = paymentSelectedIds.includes(card.instanceId);
                        // When debt is covered, disable other unselected cards to prevent accidental overpayment
                        const isDisabled = !isSelected && isGoalReached;

                        return (
                          <button
                            key={card.instanceId}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              setPaymentSelectedIds((prev) =>
                                isSelected
                                  ? prev.filter((id) => id !== card.instanceId)
                                  : [...prev, card.instanceId],
                              );
                            }}
                            style={{
                              padding: "7px 12px",
                              borderRadius: "8px",
                              background: isSelected
                                ? "var(--primary)"
                                : isDisabled
                                ? "rgba(255, 255, 255, 0.03)"
                                : "var(--surface)",
                              color: isSelected
                                ? "var(--on-primary)"
                                : isDisabled
                                ? "var(--outline)"
                                : "inherit",
                              border: `1.5px solid ${isSelected ? "var(--primary)" : isDisabled ? "rgba(255, 255, 255, 0.06)" : "var(--outline)"}`,
                              cursor: isDisabled ? "not-allowed" : "pointer",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              opacity: isDisabled ? 0.45 : 1,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {/* Color / Source Badge */}
                            {card.source === "property" && card.color ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  backgroundColor: COLOR_CONFIG[card.color]?.hex || "#0055A4",
                                  color: COLOR_CONFIG[card.color]?.textHex || "#FFFFFF",
                                  fontSize: "0.62rem",
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                  flexShrink: 0,
                                  boxShadow: `0 0 6px ${COLOR_CONFIG[card.color]?.hex || "#0055A4"}40`,
                                }}
                              >
                                {card.isHouse ? "🏠 House" : card.isHotel ? "🏨 Hotel" : COLOR_CONFIG[card.color]?.name || card.color}
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  backgroundColor: "rgba(102, 223, 117, 0.2)",
                                  color: "#66df75",
                                  border: "1px solid rgba(102, 223, 117, 0.3)",
                                  fontSize: "0.62rem",
                                  fontWeight: 800,
                                  letterSpacing: "0.04em",
                                  flexShrink: 0,
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: "11px" }}>
                                  payments
                                </span>
                                BANK
                              </span>
                            )}

                            <span>{card.name}</span>
                            <span style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", opacity: isSelected ? 0.9 : 0.75 }}>
                              (${card.value}M)
                            </span>
                            {isSelected && (
                              <span className="material-symbols-outlined" style={{ fontSize: "15px", fontWeight: 900 }}>
                                check
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="dialog-footer">
                <button
                  type="button"
                  className="button button--primary button--full"
                  disabled={!canSubmit}
                  onClick={handlePaymentSubmit}
                  style={{
                    opacity: !canSubmit ? 0.5 : 1,
                    cursor: !canSubmit ? "not-allowed" : "pointer",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                    {canSubmit ? "check_circle" : "lock"}
                  </span>
                  {canSubmit
                    ? `Submit Payment ($${totalSelected}M)`
                    : `Select $${remainingDue}M more to submit`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Discard Resolution Modal */}
      {pending?.type === "discard" && pending.playerId === actualPlayerId && (
        <div className="join-dialog-overlay" role="dialog" aria-modal="true">
          <div className="dialog-scrim" />
          <div className="dialog-panel dialog-panel--wide">
            <div className="texture-overlay" />
            <div className="sheet-handle" />

            <div className="dialog-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ color: "#ef4444", fontSize: "24px" }}>
                  delete_sweep
                </span>
                <h2 style={{ color: "#ef4444", fontSize: "1.15rem", margin: 0 }}>Hand Limit Exceeded</h2>
              </div>
            </div>

            <div className="dialog-body">
              <p style={{ margin: 0, fontSize: "0.88rem" }}>
                You have {you?.hand?.length} cards. Please select <b>{pending.requiredDiscardCount}</b> card(s) to discard:
              </p>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
            </div>

            <div className="dialog-footer">
              <button
                type="button"
                className="button button--primary button--full"
                disabled={discardSelectedIds.length !== pending.requiredDiscardCount}
                onClick={handleDiscardSubmit}
                style={{
                  opacity: discardSelectedIds.length !== pending.requiredDiscardCount ? 0.5 : 1,
                }}
              >
                Discard {discardSelectedIds.length}/{pending.requiredDiscardCount} Cards
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Game Confirmation Dialog */}
      {isExitDialogOpen && (
        <div className="join-dialog-overlay" role="dialog" aria-modal="true" style={{ zIndex: 300 }}>
          <div className="dialog-scrim" onClick={() => setIsExitDialogOpen(false)} />
          <div className="dialog-panel" style={{ maxWidth: "420px" }}>
            <div className="texture-overlay" />
            <div className="sheet-handle" />

            <div className="dialog-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ color: "#ef4444", fontSize: "24px" }}>
                  logout
                </span>
                <h2 style={{ fontSize: "1.15rem", margin: 0 }}>Leave Game?</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsExitDialogOpen(false)}
                aria-label="Close dialog"
                className="dialog-close-btn"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  close
                </span>
              </button>
            </div>

            <div className="dialog-body" style={{ padding: "20px" }}>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--on-surface-variant)", lineHeight: 1.5 }}>
                {isBotMode
                  ? "Are you sure you want to leave? Your match progress will be lost and you will return to the home page."
                  : (roomInfo?.hostPlayerId === actualPlayerId 
                    ? "Are you sure you want to leave? Because you are the Host, this will instantly end the game for everyone."
                    : "Are you sure you want to leave? A bot will take over your seat for the remainder of the game."
                  )}
              </p>
            </div>

            <div className="dialog-footer" style={{ gap: "10px" }}>
              <button
                type="button"
                className="button button--secondary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setIsExitDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button--primary"
                style={{ flex: 1, justifyContent: "center", backgroundColor: "#ef4444", color: "#fff", border: "none" }}
                onClick={() => {
                  setIsExitDialogOpen(false);
                  handleExitGame();
                }}
              >
                Confirm Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rearrange / Switch Wildcard Modal */}
      {reorganizeTarget && (
        <div
          className="join-dialog-overlay"
          role="dialog"
          aria-modal="true"
          style={{ zIndex: 250 }}
          onClick={() => setReorganizeTarget(null)}
        >
          <div className="dialog-scrim" />
          <div
            className="dialog-panel"
            style={{ maxWidth: "440px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="texture-overlay" />
            <div className="sheet-handle" />

            <div className="dialog-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: "24px" }}>
                  sync_alt
                </span>
                <h2 style={{ fontSize: "1.15rem", margin: 0 }}>Rearrange Property Wild Card</h2>
              </div>
              <button
                type="button"
                onClick={() => setReorganizeTarget(null)}
                aria-label="Close"
                className="dialog-close-btn"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  close
                </span>
              </button>
            </div>

            <div className="dialog-body" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Free action banner */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(102, 223, 117, 0.12)",
                  border: "1px solid rgba(102, 223, 117, 0.3)",
                  color: "var(--green)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  bolt
                </span>
                <span>FREE ACTION • 0 Action Energy consumed</span>
              </div>

              {/* Current position */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--muted)" }}>
                <span>Currently in set:</span>
                <span style={{ fontWeight: 800, color: COLOR_CONFIG[reorganizeTarget.fromSet.color]?.hex || "var(--primary)", textTransform: "uppercase" }}>
                  {reorganizeTarget.fromSet.color} ({reorganizeTarget.fromSet.cards.length}/{reorganizeTarget.fromSet.setSize} cards)
                </span>
              </div>

              {/* House/Hotel warning if set has buildings */}
              {(reorganizeTarget.fromSet.hasHouse || reorganizeTarget.fromSet.hasHotel) &&
                (reorganizeTarget.fromSet.cards.length - 1 < reorganizeTarget.fromSet.setSize) && (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      color: "#ef4444",
                      fontSize: "0.78rem",
                      lineHeight: 1.4,
                    }}
                  >
                    ⚠️ Cannot move this wildcard: this set has a House/Hotel attached which strictly requires a completed set.
                  </div>
                )}

              {/* Color Options Grid */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)" }}>
                  SELECT NEW COLOR FOR THIS WILDCARD:
                </span>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {(() => {
                    const card = reorganizeTarget.card;
                    const availableColors: CardColor[] =
                      card.primaryColor === "all"
                        ? [
                            "brown",
                            "dark-blue",
                            "green",
                            "light-blue",
                            "orange",
                            "pink",
                            "railroad",
                            "red",
                            "utility",
                            "yellow",
                          ]
                        : [card.primaryColor as CardColor, card.secondaryColor as CardColor].filter(Boolean) as CardColor[];

                    const hasBuildingBlock =
                      (reorganizeTarget.fromSet.hasHouse || reorganizeTarget.fromSet.hasHotel) &&
                      (reorganizeTarget.fromSet.cards.length - 1 < reorganizeTarget.fromSet.setSize);

                    return availableColors.map((color) => {
                      const isCurrent = color === (card.currentColor || reorganizeTarget.fromSet.color);
                      const colorHex = COLOR_CONFIG[color]?.hex || "#0055a4";
                      const existingSet = you?.propertySets.find((s) => s.color === color && !s.isComplete);

                      return (
                        <button
                          key={color}
                          type="button"
                          disabled={hasBuildingBlock || isCurrent}
                          onClick={() => {
                            sendCommand({
                              type: "reorganize_wild",
                              playerId: actualPlayerId,
                              cardInstanceId: card.instanceId,
                              fromSetId: reorganizeTarget.fromSet.setId,
                              newColor: color,
                            });
                            setReorganizeTarget(null);
                          }}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "10px",
                            background: isCurrent ? "rgba(255,255,255,0.06)" : "var(--surface)",
                            border: `2px solid ${isCurrent ? colorHex : "var(--outline-variant)"}`,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: "4px",
                            cursor: hasBuildingBlock || isCurrent ? "not-allowed" : "pointer",
                            opacity: hasBuildingBlock ? 0.4 : (isCurrent ? 0.6 : 1),
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
                            <span
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                backgroundColor: colorHex,
                                display: "inline-block",
                              }}
                            />
                            <span style={{ fontWeight: 800, fontSize: "0.82rem", textTransform: "uppercase", color: "#FFFFFF" }}>
                              {color}
                            </span>
                            {isCurrent && (
                              <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--muted)" }}>
                                Current
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: "0.68rem", color: "var(--muted)", textAlign: "left" }}>
                            {existingSet
                              ? `Join existing (${existingSet.cards.length}/${existingSet.setSize})`
                              : `Start new set (0/${COLOR_CONFIG[color]?.setSize || 3})`}
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            <div className="dialog-footer">
              <button
                type="button"
                className="button button--secondary button--full"
                onClick={() => setReorganizeTarget(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Building Modal (House / Hotel Reorganization) */}
      {moveBuildingTarget && (
        <div className="join-dialog-overlay" role="dialog" aria-modal="true" style={{ zIndex: 210 }}>
          <div className="dialog-scrim" onClick={() => setMoveBuildingTarget(null)} />
          <div className="dialog-panel" style={{ maxWidth: "500px" }}>
            <div className="texture-overlay" />
            <div className="sheet-handle" />

            <div className="dialog-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ color: "#38bdf8", fontSize: "24px" }}>
                  {moveBuildingTarget.buildingType === "house" ? "home" : "apartment"}
                </span>
                <div>
                  <h2 style={{ color: "#f8fafc", fontSize: "1.15rem", margin: 0, fontWeight: 800 }}>
                    Move {moveBuildingTarget.buildingType === "house" ? "House" : "Hotel"} (Free Action)
                  </h2>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                    Moving from {moveBuildingTarget.fromSet.color.toUpperCase()} complete set
                  </span>
                </div>
              </div>
            </div>

            <div className="dialog-body" style={{ padding: "16px 20px" }}>
              <p style={{ margin: "0 0 14px", color: "var(--on-surface-variant)", fontSize: "0.88rem", lineHeight: 1.4 }}>
                Select another completed property set to move your {moveBuildingTarget.buildingType} to:
              </p>

              {(() => {
                const eligibleSets = (you?.propertySets || []).filter((s) => {
                  if (s.setId === moveBuildingTarget.fromSet.setId) return false;
                  if (!s.isComplete) return false;
                  if (s.color === "railroad" || s.color === "utility") return false;
                  if (moveBuildingTarget.buildingType === "house") {
                    return !s.hasHouse;
                  } else {
                    return s.hasHouse && !s.hasHotel;
                  }
                });

                if (eligibleSets.length === 0) {
                  return (
                    <div style={{ padding: "20px", textAlign: "center", background: "rgba(255, 255, 255, 0.04)", borderRadius: "10px", border: "1px dashed rgba(255, 255, 255, 0.15)" }}>
                      <p style={{ color: "var(--outline)", fontSize: "0.85rem", margin: 0 }}>
                        {moveBuildingTarget.buildingType === "house"
                          ? "No other complete sets without a House available."
                          : "No other complete sets with a House (and without a Hotel) available."}
                      </p>
                    </div>
                  );
                }

                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
                    {eligibleSets.map((destSet) => {
                      const colorHex = COLOR_CONFIG[destSet.color]?.hex || "#38bdf8";
                      return (
                        <button
                          key={destSet.setId}
                          type="button"
                          onClick={() => {
                            sendCommand({
                              type: "move_building",
                              playerId: actualPlayerId,
                              buildingType: moveBuildingTarget.buildingType,
                              fromSetId: moveBuildingTarget.fromSet.setId,
                              toSetId: destSet.setId,
                            });
                            setMoveBuildingTarget(null);
                          }}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "10px",
                            background: "var(--surface)",
                            border: `2px solid ${colorHex}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span
                              style={{
                                width: "14px",
                                height: "14px",
                                borderRadius: "50%",
                                backgroundColor: colorHex,
                                display: "inline-block",
                              }}
                            />
                            <div style={{ textAlign: "left" }}>
                              <span style={{ fontWeight: 800, fontSize: "0.9rem", textTransform: "uppercase", color: "#FFFFFF", display: "block" }}>
                                {destSet.color} Set
                              </span>
                              <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                                {destSet.cards.length}/{destSet.setSize} cards • {destSet.hasHouse ? "Has House" : "No House"}
                              </span>
                            </div>
                          </div>
                          <span className="button button--primary" style={{ padding: "6px 14px", fontSize: "0.8rem", pointerEvents: "none" }}>
                            Move Here ➔
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="dialog-footer" style={{ padding: "12px 20px" }}>
              <button
                type="button"
                className="button button--secondary button--full"
                onClick={() => setMoveBuildingTarget(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Targeted Steal Notification Modal (Victim Alert) */}
      {stolenAlert && (
        <div className="join-dialog-overlay" role="dialog" aria-modal="true" style={{ zIndex: 220 }}>
          <div className="dialog-scrim" onClick={() => setStolenAlert(null)} />
          <div className="dialog-panel" style={{ maxWidth: "560px", border: "2px solid #ef4444", boxShadow: "0 0 30px rgba(239, 68, 68, 0.45)" }}>
            <div className="texture-overlay" />
            <div className="sheet-handle" />

            <div className="dialog-header" style={{ borderBottom: "1px solid rgba(239, 68, 68, 0.2)", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-symbols-outlined" style={{ color: "#ef4444", fontSize: "28px" }}>
                  {stolenAlert.type === "deal_breaker" ? "gavel" : stolenAlert.type === "sly_deal" ? "visibility" : "swap_horiz"}
                </span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: "4px", textTransform: "uppercase" }}>
                      Action Played on You
                    </span>
                  </div>
                  <h2 style={{ color: "#f87171", fontSize: "1.2rem", margin: "4px 0 0", fontWeight: 800 }}>
                    {stolenAlert.type === "deal_breaker"
                      ? "⚡ Complete Property Set Stolen!"
                      : stolenAlert.type === "sly_deal"
                      ? "🕵️ Property Card Stolen!"
                      : "🔄 Forced Deal Property Swap!"}
                  </h2>
                </div>
              </div>
            </div>

            <div className="dialog-body" style={{ textAlign: "center", padding: "16px 20px" }}>
              <p style={{ margin: "0 0 16px", color: "var(--on-surface-variant)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                <strong style={{ color: "#FFFFFF" }}>{stolenAlert.attackerName}</strong> played{" "}
                <strong style={{ color: "#ef4444" }}>{stolenAlert.actionName}</strong> targeting your properties!
              </p>

              {/* Action Card & Stolen Cards Showcase */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: "rgba(0, 0, 0, 0.3)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                {stolenAlert.actionCard && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", borderBottom: "1px dashed rgba(255, 255, 255, 0.12)", paddingBottom: "14px" }}>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                        Action Card Used:
                      </span>
                      <div style={{ display: "inline-block", transform: "scale(0.85)", transformOrigin: "top center" }}>
                        <Card card={resolveCardDef(stolenAlert.actionCard)} size="sm" isInteractive={false} />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <span style={{ fontSize: "0.78rem", color: "#f87171", textTransform: "uppercase", fontWeight: 800, display: "block", marginBottom: "10px" }}>
                    {stolenAlert.type === "deal_breaker"
                      ? `Cards Stolen From You (${stolenAlert.stolenCards.length}):`
                      : stolenAlert.type === "sly_deal"
                      ? "Card Stolen From You:"
                      : "Card Taken From You:"}
                  </span>

                  {stolenAlert.stolenCards.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      {stolenAlert.stolenCards.map((c) => (
                        <div key={c.instanceId} style={{ transform: "scale(0.85)", transformOrigin: "center" }}>
                          <Card card={resolveCardDef(c)} size="sm" isInteractive={false} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>Property cards transferred.</p>
                  )}
                </div>

                {stolenAlert.swappedCard && (
                  <div style={{ borderTop: "1px dashed rgba(255, 255, 255, 0.12)", paddingTop: "14px" }}>
                    <span style={{ fontSize: "0.78rem", color: "#34d399", textTransform: "uppercase", fontWeight: 800, display: "block", marginBottom: "10px" }}>
                      Card Given to You in Return:
                    </span>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <div style={{ transform: "scale(0.85)", transformOrigin: "center" }}>
                        <Card card={resolveCardDef(stolenAlert.swappedCard)} size="sm" isInteractive={false} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="dialog-footer" style={{ justifyContent: "center", padding: "16px 20px" }}>
              <button
                type="button"
                className="button button--primary"
                style={{ width: "100%", maxWidth: "240px", background: "#ef4444", borderColor: "#dc2626" }}
                onClick={() => setStolenAlert(null)}
              >
                Understood / Dismiss
              </button>
            </div>
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

              {/* Match Details Box */}
              <div style={{ padding: "12px", background: "var(--surface)", borderRadius: "10px", border: "1px solid var(--outline-variant)", display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Current Match</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>
                  {isLocal ? "🤖 Offline Bot Match" : `Multiplayer Room: ${urlRoomCode}`}
                </span>
                <span style={{ fontSize: "0.75rem", color: isConnected ? "var(--green)" : "#f59e0b" }}>
                  ● {isConnected ? "Connected & Active" : "Reconnecting..."}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsExitDialogOpen(true);
                }}
                className="button button--secondary button--full"
                style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px", fontSize: "0.82rem", color: "#ef4444" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>exit_to_app</span>
                Leave Game
              </button>

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

      {/* Interactive Framer Motion Card Action Dialog */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            className="game-card-action-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setSelectedCard(null)}
          >
            <motion.div
              className="game-card-action-dialog"
              initial={{ scale: 0.88, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 16, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350, mass: 0.7 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Card Type Pill and Close Button */}
              <div className="game-card-action-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <span className="game-card-type-tag">
                    {selectedCard.type === "property" && "🏠 PROPERTY"}
                    {selectedCard.type === "property-wild" && "🌈 WILD PROPERTY"}
                    {selectedCard.type === "money" && "💰 CASH"}
                    {selectedCard.type === "action" && "⚡ ACTION CARD"}
                    {selectedCard.type === "rent" && "💸 RENT"}
                  </span>
                  <b style={{ fontSize: "0.95rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedCard.name}
                  </b>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCard(null)}
                  className="game-icon-btn"
                  style={{ width: "32px", height: "32px", flexShrink: 0 }}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="game-card-action-body">
                {/* Spotlight Card Preview with Glowing Backdrop */}
                <div className="game-card-spotlight-wrap">
                  <div
                    className="game-card-spotlight-glow"
                    style={{
                      background:
                        COLOR_CONFIG[selectedCard.primaryColor || selectedCard.currentColor || "dark-blue"]?.hex ||
                        "var(--primary)",
                    }}
                  />
                  <Card
                    card={resolveCardDef(selectedCard)}
                    size="md"
                    isInteractive={false}
                  />
                </div>

                {/* Interactive Tactile Action Choices */}
                <div className="game-card-action-options">
                  {/* Regular Property */}
                  {selectedCard.type === "property" && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="game-action-choice-btn game-action-choice-btn--primary"
                      onClick={() => handlePlayProperty(selectedCard)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>domain</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span>Play to Property Set</span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                            Add to your {selectedCard.primaryColor?.toUpperCase()} sets
                          </span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </motion.button>
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
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.04em" }}>
                            SELECT SET COLOR TO ATTACH:
                          </span>
                          <div style={{ display: "grid", gridTemplateColumns: canPrimary && canSecondary ? "1fr 1fr" : "1fr", gap: "8px" }}>
                            {canPrimary && (
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                className="button button--primary"
                                style={{
                                  background: COLOR_CONFIG[selectedCard.primaryColor!]?.hex || "var(--primary)",
                                  color: COLOR_CONFIG[selectedCard.primaryColor!]?.textHex || "#FFFFFF",
                                  padding: "12px 10px",
                                  fontSize: "0.84rem",
                                  fontWeight: 800,
                                }}
                                onClick={() => handlePlayProperty(selectedCard, selectedCard.primaryColor)}
                              >
                                🏠 {selectedCard.primaryColor?.toUpperCase()}
                              </motion.button>
                            )}
                            {canSecondary && (
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                className="button button--primary"
                                style={{
                                  background: COLOR_CONFIG[selectedCard.secondaryColor!]?.hex || "var(--primary)",
                                  color: COLOR_CONFIG[selectedCard.secondaryColor!]?.textHex || "#FFFFFF",
                                  padding: "12px 10px",
                                  fontSize: "0.84rem",
                                  fontWeight: 800,
                                }}
                                onClick={() => handlePlayProperty(selectedCard, selectedCard.secondaryColor)}
                              >
                                🏠 {selectedCard.secondaryColor?.toUpperCase()}
                              </motion.button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "rgba(245, 158, 11, 0.15)",
                          border: "1px solid rgba(245, 158, 11, 0.4)",
                          borderRadius: "10px",
                          fontSize: "0.78rem",
                          color: "#fcd34d",
                          lineHeight: 1.35,
                        }}
                      >
                        ⚠️ Wild Property Cards must attach to an existing {selectedCard.primaryColor?.toUpperCase()} or {selectedCard.secondaryColor?.toUpperCase()} set on your table. You can bank it for cash below.
                      </div>
                    );
                  })()}

                  {/* Wild Property Multicolor (All 10 Colors) */}
                  {selectedCard.type === "property-wild" && selectedCard.primaryColor === "all" && (() => {
                    const eligibleSets = you?.propertySets.filter((s) => !s.isComplete) || [];

                    if (eligibleSets.length > 0) {
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.04em" }}>
                            SELECT EXISTING INCOMPLETE SET:
                          </span>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            {eligibleSets.map((set) => (
                              <motion.button
                                key={set.setId}
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                className="button"
                                style={{
                                  backgroundColor: COLOR_CONFIG[set.color]?.hex || "var(--surface-high)",
                                  color: COLOR_CONFIG[set.color]?.textHex || "#FFFFFF",
                                  padding: "10px 8px",
                                  fontSize: "0.78rem",
                                  fontWeight: 800,
                                  borderRadius: "10px",
                                  textAlign: "center",
                                  textTransform: "uppercase",
                                }}
                                onClick={() => handlePlayProperty(selectedCard, set.color, set.setId)}
                              >
                                {set.color.replace("-", " ")} ({set.cards.length}/{set.setSize})
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "rgba(245, 158, 11, 0.15)",
                          border: "1px solid rgba(245, 158, 11, 0.4)",
                          borderRadius: "10px",
                          fontSize: "0.78rem",
                          color: "#fcd34d",
                          lineHeight: 1.35,
                        }}
                      >
                        ⚠️ Multicolor Wild Card must attach to an existing incomplete property set on your table. You can bank it for cash below.
                      </div>
                    );
                  })()}

                  {/* Bank Action (Any card with monetary value > 0) */}
                  {selectedCard.value > 0 && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="game-action-choice-btn game-action-choice-btn--bank"
                      onClick={() => handleBankCard(selectedCard)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>savings</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span>Deposit ${selectedCard.value}M into Bank</span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(134, 239, 172, 0.8)", fontWeight: 500 }}>
                            Safe from rent & action steals
                          </span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined">account_balance</span>
                    </motion.button>
                  )}

                  {/* Action: Pass Go */}
                  {selectedCard.defId === "action-pass-go" && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="game-action-choice-btn game-action-choice-btn--primary"
                      onClick={() => handlePlayAction(selectedCard)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>fast_forward</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span>Play Pass Go (+2 Cards)</span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                            Instantly draw 2 extra cards into hand
                          </span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined">add_card</span>
                    </motion.button>
                  )}

                  {/* Action: Deal Breaker */}
                  {selectedCard.defId === "action-deal-breaker" && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="game-action-choice-btn game-action-choice-btn--fire"
                      onClick={() => {
                        const cardToTarget = selectedCard;
                        setSelectedCard(null);
                        setTargetingAction({ card: cardToTarget, type: "deal_breaker" });
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>gavel</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span>👑 Deal Breaker (Steal Complete Set)</span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
                            Steal an entire completed property set from an opponent!
                          </span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </motion.button>
                  )}

                  {/* Action: Sly Deal */}
                  {selectedCard.defId === "action-sly-deal" && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="game-action-choice-btn game-action-choice-btn--primary"
                      onClick={() => {
                        const cardToTarget = selectedCard;
                        setSelectedCard(null);
                        setTargetingAction({ card: cardToTarget, type: "sly_deal" });
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>visibility</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span>🕵️ Sly Deal (Steal 1 Property)</span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                            Steal 1 property card from any incomplete set
                          </span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </motion.button>
                  )}

                  {/* Action: Debt Collector */}
                  {selectedCard.defId === "action-debt-collector" && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="game-action-choice-btn game-action-choice-btn--primary"
                      onClick={() => {
                        const cardToTarget = selectedCard;
                        setSelectedCard(null);
                        setTargetingAction({ card: cardToTarget, type: "debt_collector" });
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>payments</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span>💵 Debt Collector (Charge $5M)</span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                            Target 1 player to pay you $5M in cash or property
                          </span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </motion.button>
                  )}

                  {/* Action: Birthday */}
                  {selectedCard.defId === "action-its-my-birthday" && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="game-action-choice-btn game-action-choice-btn--primary"
                      onClick={() => handlePlayAction(selectedCard)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>cake</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span>🎂 It's My Birthday (Collect $2M from All)</span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                            Every other player pays you $2M gift!
                          </span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </motion.button>
                  )}

                  {/* Action: Forced Deal */}
                  {(selectedCard.defId === "action-forced-deal" || selectedCard.defId === "action-force-deal") && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="game-action-choice-btn game-action-choice-btn--primary"
                      onClick={() => {
                        const cardToTarget = selectedCard;
                        setSelectedCard(null);
                        setTargetingAction({ card: cardToTarget, type: "forced_deal" });
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>swap_horiz</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span>🔄 Forced Deal (Swap Properties)</span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                            Force-swap 1 of your properties with an opponent's property
                          </span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </motion.button>
                  )}

                  {/* Action: House */}
                  {selectedCard.defId === "action-house" && (() => {
                    const eligibleSets = you?.propertySets.filter(
                      (s) => s.isComplete && !s.hasHouse && s.color !== "railroad" && s.color !== "utility"
                    ) || [];

                    if (eligibleSets.length > 0) {
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.04em" }}>
                            SELECT COMPLETE SET TO ADD HOUSE:
                          </span>
                          {eligibleSets.map((set) => (
                            <motion.button
                              key={set.setId}
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              className="button button--primary button--full"
                              style={{
                                backgroundColor: COLOR_CONFIG[set.color]?.hex || "var(--primary)",
                                color: COLOR_CONFIG[set.color]?.textHex || "#FFFFFF",
                                padding: "12px 14px",
                                fontWeight: 800,
                                fontSize: "0.86rem",
                              }}
                              onClick={() => handlePlayAction(selectedCard, undefined, set.setId)}
                            >
                              🏠 Add House to {set.color.toUpperCase()} (+ $3M Rent)
                            </motion.button>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "rgba(245, 158, 11, 0.15)",
                          border: "1px solid rgba(245, 158, 11, 0.4)",
                          borderRadius: "10px",
                          fontSize: "0.78rem",
                          color: "#fcd34d",
                          lineHeight: 1.35,
                        }}
                      >
                        ⚠️ You need a complete color set (excluding Railroads & Utilities) to place a House. You can deposit it into your bank for $3M cash.
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
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.04em" }}>
                            SELECT SET WITH HOUSE TO ADD HOTEL:
                          </span>
                          {eligibleSets.map((set) => (
                            <motion.button
                              key={set.setId}
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              className="button button--primary button--full"
                              style={{
                                backgroundColor: COLOR_CONFIG[set.color]?.hex || "var(--primary)",
                                color: COLOR_CONFIG[set.color]?.textHex || "#FFFFFF",
                                padding: "12px 14px",
                                fontWeight: 800,
                                fontSize: "0.86rem",
                              }}
                              onClick={() => handlePlayAction(selectedCard, undefined, set.setId)}
                            >
                              🏨 Add Hotel to {set.color.toUpperCase()} (+ $4M Rent)
                            </motion.button>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "rgba(245, 158, 11, 0.15)",
                          border: "1px solid rgba(245, 158, 11, 0.4)",
                          borderRadius: "10px",
                          fontSize: "0.78rem",
                          color: "#fcd34d",
                          lineHeight: 1.35,
                        }}
                      >
                        ⚠️ You need a complete property set with an existing House 🏠 to place a Hotel. You can deposit it into your bank for $4M cash.
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
                            padding: "10px 14px",
                            background: "rgba(168, 200, 255, 0.1)",
                            border: "1px solid rgba(168, 200, 255, 0.3)",
                            borderRadius: "10px",
                            fontSize: "0.78rem",
                            color: "var(--primary)",
                            lineHeight: 1.35,
                          }}
                        >
                          ℹ️ Double The Rent must be played together with a Rent card. You currently have no Rent cards in hand. You can bank it for $1M.
                        </div>
                      );
                    }

                    if (!canDouble) {
                      return (
                        <div
                          style={{
                            padding: "10px 14px",
                            background: "rgba(245, 158, 11, 0.15)",
                            border: "1px solid rgba(245, 158, 11, 0.4)",
                            borderRadius: "10px",
                            fontSize: "0.78rem",
                            color: "#fcd34d",
                            lineHeight: 1.35,
                          }}
                        >
                          ⚠️ Playing Double The Rent requires 2 actions. You only have {gameState.turn.actionsRemaining} action left this turn.
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
                              <motion.button
                                key={rCard.instanceId}
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                className="button button--primary button--full"
                                style={{
                                  background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
                                  color: "#FFFFFF",
                                  padding: "12px 14px",
                                  fontSize: "0.86rem",
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
                              </motion.button>
                            );
                          }

                          return (
                            <div key={rCard.instanceId} style={{ display: "grid", gridTemplateColumns: rCard.secondaryColor ? "1fr 1fr" : "1fr", gap: "8px" }}>
                              {rCard.primaryColor && (
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.97 }}
                                  className="button button--primary"
                                  style={{
                                    background: COLOR_CONFIG[rCard.primaryColor as CardColor]?.hex || "var(--primary)",
                                    color: "#FFFFFF",
                                    padding: "12px 8px",
                                    fontSize: "0.82rem",
                                    fontWeight: 800,
                                  }}
                                  onClick={() => handlePlayRent(rCard, rCard.primaryColor as CardColor, undefined, selectedCard.instanceId)}
                                >
                                  🔥 2x {rCard.primaryColor.toUpperCase()}
                                </motion.button>
                              )}
                              {rCard.secondaryColor && (
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.97 }}
                                  className="button button--primary"
                                  style={{
                                    background: COLOR_CONFIG[rCard.secondaryColor as CardColor]?.hex || "var(--primary)",
                                    color: "#FFFFFF",
                                    padding: "12px 8px",
                                    fontSize: "0.82rem",
                                    fontWeight: 800,
                                  }}
                                  onClick={() => handlePlayRent(rCard, rCard.secondaryColor as CardColor, undefined, selectedCard.instanceId)}
                                >
                                  🔥 2x {rCard.secondaryColor.toUpperCase()}
                                </motion.button>
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
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.97 }}
                                  className="button button--primary"
                                  style={{
                                    background: COLOR_CONFIG[selectedCard.primaryColor as CardColor]?.hex || "var(--primary)",
                                    color: "#FFFFFF",
                                    padding: "12px 8px",
                                    fontSize: "0.84rem",
                                    fontWeight: 800,
                                  }}
                                  onClick={() => handlePlayRent(selectedCard, selectedCard.primaryColor as CardColor)}
                                >
                                  💸 Rent: {selectedCard.primaryColor.toUpperCase()}
                                </motion.button>
                              )}
                              {selectedCard.secondaryColor && (
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.97 }}
                                  className="button button--primary"
                                  style={{
                                    background: COLOR_CONFIG[selectedCard.secondaryColor as CardColor]?.hex || "var(--primary)",
                                    color: "#FFFFFF",
                                    padding: "12px 8px",
                                    fontSize: "0.84rem",
                                    fontWeight: 800,
                                  }}
                                  onClick={() => handlePlayRent(selectedCard, selectedCard.secondaryColor as CardColor)}
                                >
                                  💸 Rent: {selectedCard.secondaryColor.toUpperCase()}
                                </motion.button>
                              )}
                            </div>

                            {canDouble && doubleRentInHand && (
                              <div style={{ display: "grid", gridTemplateColumns: selectedCard.secondaryColor ? "1fr 1fr" : "1fr", gap: "8px" }}>
                                {selectedCard.primaryColor && (
                                  <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="button button--primary"
                                    style={{
                                      background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
                                      color: "#FFFFFF",
                                      padding: "12px 8px",
                                      fontSize: "0.82rem",
                                      fontWeight: 800,
                                    }}
                                    onClick={() => handlePlayRent(selectedCard, selectedCard.primaryColor as CardColor, undefined, doubleRentInHand.instanceId)}
                                  >
                                    🔥 2x {selectedCard.primaryColor.toUpperCase()} (2 Actions)
                                  </motion.button>
                                )}
                                {selectedCard.secondaryColor && (
                                  <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="button button--primary"
                                    style={{
                                      background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
                                      color: "#FFFFFF",
                                      padding: "12px 8px",
                                      fontSize: "0.82rem",
                                      fontWeight: 800,
                                    }}
                                    onClick={() => handlePlayRent(selectedCard, selectedCard.secondaryColor as CardColor, undefined, doubleRentInHand.instanceId)}
                                  >
                                    🔥 2x {selectedCard.secondaryColor.toUpperCase()} (2 Actions)
                                  </motion.button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              className="button button--primary button--full"
                              style={{ padding: "12px", fontSize: "0.9rem" }}
                              onClick={() => {
                                const cardToTarget = selectedCard;
                                setSelectedWildRentColor(null);
                                setSelectedCard(null);
                                setTargetingAction({ card: cardToTarget, type: "wild_rent" });
                              }}
                            >
                              🎯 Charge Wild Rent (1 Opponent)
                            </motion.button>
                            {canDouble && doubleRentInHand && (
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                className="button button--primary button--full"
                                style={{
                                  background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
                                  color: "#FFFFFF",
                                  padding: "12px",
                                  fontSize: "0.9rem",
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
                              </motion.button>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flying Drawn Cards Overlay (Draw Flight Animation) */}
      <AnimatePresence>
        {flyingCards.map((item) => (
          <motion.div
            key={item.id}
            className="game-flying-draw-card"
            initial={{
              left: item.startX,
              top: item.startY,
              scale: 0.82,
              rotate: -12,
              opacity: 0,
            }}
            animate={{
              left: [item.startX, item.startX + (item.endX - item.startX) * 0.35, item.endX],
              top: [item.startY, item.startY - 75, item.endY],
              scale: [0.82, 1.18, 1.0],
              rotate: [-12, 6, item.rotate],
              opacity: [0, 1, 1, 0.95],
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              duration: 0.72,
              delay: item.delay,
              ease: [0.22, 1, 0.36, 1],
            }}
            onAnimationComplete={() => {
              setFlyingCards((prev) => {
                const remaining = prev.filter((c) => c.id !== item.id);
                if (remaining.length === 0) {
                  isAnimatingDrawRef.current = false;
                }
                return remaining;
              });
            }}
          >
            <div className="game-flying-card-inner">
              <CardBack size="sm" isInteractive={false} />
              <div className="game-flying-card-sheen" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Opponent Table View Modal */}
      {viewingOpponentId && (() => {
        const opp = opponents.find(o => o.id === viewingOpponentId);
        if (!opp) return null;

        return (
          <div className="join-dialog-overlay" role="dialog" aria-modal="true" style={{ zIndex: 300 }}>
            <div className="dialog-scrim" onClick={() => setViewingOpponentId(null)} />
            <div className="dialog-panel dialog-panel--table">
              <div className="texture-overlay" />
              <div className="sheet-handle" />

              <div className="dialog-header">
                <div>
                  <h2 style={{ fontSize: "1.1rem", margin: "0 0 4px" }}>{opp.name}&apos;s Table</h2>
                  <div className="game-opponent-metrics" style={{ fontSize: "0.8rem" }}>
                    <span>{opp.handCount} Cards in Hand (Hidden)</span>
                    <span>•</span>
                    <span style={{ color: "#66df75" }}>Bank: ${opp.bankTotal}M</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="dialog-close-btn"
                  onClick={() => setViewingOpponentId(null)}
                  aria-label="Close dialog"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>close</span>
                </button>
              </div>

              {/* Exact replica of bottom table layout but for opponent */}
              <div className="dialog-body">
                <div className="game-player-assets-row" style={{ minHeight: "auto", alignItems: "flex-start" }}>
                  {/* Bank Panel (Fixed Size & Clickable) */}
                  <div
                    className="game-bank-panel"
                    onClick={() => setViewingBankPlayerId(opp.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${opp.name}'s banked cash cards`}
                    title={`Click to view ${opp.name}'s bank vault`}
                  >
                    <div className="game-bank-header">
                      <span className="game-bank-title">BANK</span>
                      <span className="game-bank-count-pill">{opp.bank.length} cards</span>
                    </div>

                    <div className="game-bank-balance-display">
                      <span className="game-bank-total">${opp.bankTotal}M</span>
                    </div>

                    <div className="game-bank-view-btn">
                      <span>View cards</span>
                      <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>
                        open_in_new
                      </span>
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

                    {/* horizontal scroll so stacked fan columns sit side by side */}
                    <div className="game-properties-sets-grid opp-sets-grid--dialog">
                      {opp.propertySets.length === 0 ? (
                        <span style={{ fontSize: "0.7rem", color: "var(--outline)", padding: "4px 0" }}>
                          No property sets laid down yet.
                        </span>
                      ) : (
                        opp.propertySets.map((set) => {
                          const colorHex = COLOR_CONFIG[set.color as CardColor]?.hex || "#0055A4";
                          // Count visible cards (properties + house/hotel chips)
                          const totalCardCount = set.cards.length + (set.hasHouse ? 1 : 0) + (set.hasHotel ? 1 : 0);
                          // Height of stacked fan: first card full height + offsets for remaining cards
                          const CARD_H = 160; // px at xs font-size
                          const OFFSET = 28; // px per card stacked below
                          const stackH = CARD_H + (totalCardCount - 1) * OFFSET;

                          return (
                            <div
                              key={set.setId}
                              className={`opp-property-set-stack ${set.isComplete ? "opp-property-set-stack--complete" : ""}`}
                              style={{
                                borderColor: colorHex,
                                minHeight: stackH + 24,
                              }}
                            >
                              {/* Color label + count badge */}
                              <div className="opp-property-set-label" style={{ color: colorHex }}>
                                <span style={{ textTransform: "uppercase", fontWeight: 800, fontSize: "0.62rem" }}>
                                  {set.color}
                                </span>
                                <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", opacity: 0.8 }}>
                                  {set.cards.length}/{set.setSize}{set.isComplete && " ★"}
                                </span>
                              </div>

                              {/* Stacked card fan */}
                              <div className="opp-property-set-fan" style={{ height: stackH }}>
                                {set.cards.map((c, idx) => (
                                  <div
                                    key={c.instanceId}
                                    className="opp-fan-card"
                                    style={{
                                      top: idx * OFFSET,
                                      zIndex: idx,
                                    }}
                                  >
                                    <Card
                                      card={c as unknown as CardDefinition}
                                      size="xs"
                                      isInteractive={false}
                                    />
                                  </div>
                                ))}
                                {/* House chip */}
                                {set.hasHouse && (
                                  <div
                                    className="opp-fan-card opp-fan-upgrade"
                                    style={{
                                      top: set.cards.length * OFFSET,
                                      zIndex: set.cards.length,
                                      background: "#16a34a",
                                      borderColor: "#4ade80",
                                    }}
                                  >
                                    <span style={{ fontSize: "1.1rem" }}>🏠</span>
                                    <span style={{ fontSize: "0.58rem", fontWeight: 800, color: "#86efac", marginTop: "2px" }}>+$3M</span>
                                  </div>
                                )}
                                {/* Hotel chip */}
                                {set.hasHotel && (
                                  <div
                                    className="opp-fan-card opp-fan-upgrade"
                                    style={{
                                      top: (set.cards.length + (set.hasHouse ? 1 : 0)) * OFFSET,
                                      zIndex: set.cards.length + (set.hasHouse ? 1 : 0),
                                      background: "#b45309",
                                      borderColor: "#fbbf24",
                                    }}
                                  >
                                    <span style={{ fontSize: "1.1rem" }}>🏨</span>
                                    <span style={{ fontSize: "0.58rem", fontWeight: 800, color: "#fde68a", marginTop: "2px" }}>+$4M</span>
                                  </div>
                                )}
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
        <div className="join-dialog-overlay" role="dialog" aria-modal="true">
          <div className="dialog-scrim" onClick={() => setIsDiscardInspectorOpen(false)} />
          <div className="discard-inspector-modal">
            <div className="discard-inspector-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>
                  layers
                </span>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                  Discard Pile ({gameState.discardPile?.length || (gameState.discardPileTop ? 1 : 0)})
                </h3>
              </div>
              <button
                type="button"
                className="game-round-icon-btn"
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
                      card={resolveCardDef(c)}
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
                    card={resolveCardDef(gameState.discardPileTop)}
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

      {/* Bank Cards Vault Modal / Mobile Bottom Sheet Drawer */}
      {viewingBankPlayerId && (() => {
        const bankPlayer =
          viewingBankPlayerId === "self" || viewingBankPlayerId === you?.id || viewingBankPlayerId === actualPlayerId
            ? you
            : gameState.players[viewingBankPlayerId] ||
              Object.values(gameState.players).find((p: { id: string }) => p.id === viewingBankPlayerId);

        if (!bankPlayer) return null;

        return (
          <div className="join-dialog-overlay" role="dialog" aria-modal="true">
            <div className="dialog-scrim" onClick={() => setViewingBankPlayerId(null)} />
            <div className="game-bank-modal-container">
              <div className="game-bank-modal-header">
                <div className="game-bank-modal-title-group">
                  <div className="game-bank-modal-icon-badge">
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      account_balance
                    </span>
                  </div>
                  <div>
                    <h3 className="game-bank-modal-title">
                      {bankPlayer.id === you?.id ? "Your Bank Vault" : `${bankPlayer.name}'s Bank Vault`}
                    </h3>
                    <p className="game-bank-modal-sub">
                      Total Assets: <strong>${bankPlayer.bankTotal}M</strong> ({bankPlayer.bank.length} cards banked)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="game-round-icon-btn"
                  onClick={() => setViewingBankPlayerId(null)}
                  title="Close Vault"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                    close
                  </span>
                </button>
              </div>

              <div className="game-bank-modal-body">
                {bankPlayer.bank.length === 0 ? (
                  <div className="game-bank-modal-empty">
                    <span className="material-symbols-outlined" style={{ fontSize: "44px", opacity: 0.4 }}>
                      savings
                    </span>
                    <p>Vault is completely empty</p>
                    <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
                      Bank money cards on your turn to protect your assets and pay rents!
                    </span>
                  </div>
                ) : (
                  <div className="game-bank-modal-grid">
                    {bankPlayer.bank.map((c: CardInstance, i: number) => (
                      <div key={`${c.instanceId}-${i}`} className="game-bank-modal-card-item">
                        <Card
                          card={resolveCardDef(c)}
                          size="sm"
                          isInteractive={false}
                        />
                        <span className="game-bank-modal-card-val">${c.value}M Cash</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
