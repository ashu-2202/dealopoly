"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import type { GameState, MaskedGameState, CardInstance, PropertySet } from "@dealopoly/game-engine";
import { COLOR_CONFIG } from "@dealopoly/shared";

interface GameOverSummaryProps {
  gameState: GameState | MaskedGameState;
  currentPlayerId: string;
  onPlayAgain?: () => void;
  roomCode?: string;
}

interface RankedPlayer {
  rank: number;
  id: string;
  name: string;
  isYou: boolean;
  isBot: boolean;
  bankTotal: number;
  completedSetsCount: number;
  propertySets: PropertySet[];
  totalWealth: number;
  isWinner: boolean;
}

interface HighlightItem {
  id: string;
  turnNumber?: number;
  icon: string;
  iconBg: string;
  iconColor: string;
  tag: string;
  title: string;
  description: string;
}

export function GameOverSummary({
  gameState,
  currentPlayerId,
  onPlayAgain,
  roomCode,
}: GameOverSummaryProps) {
  const winnerId = gameState.winnerId;
  const isYouWinner = winnerId === currentPlayerId;
  const winner = winnerId ? gameState.players[winnerId] : null;

  // Generate Confetti on victory
  const [confettiPieces, setConfettiPieces] = useState<
    Array<{ id: number; left: number; bg: string; dur: number; delay: number; isRound: boolean }>
  >([]);

  useEffect(() => {
    if (isYouWinner) {
      const colors = ["#a8c8ff", "#66df75", "#ffb77d", "#ffdad6", "#ffd700", "#ffffff"];
      const pieces = Array.from({ length: 45 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        bg: colors[Math.floor(Math.random() * colors.length)] ?? "#a8c8ff",
        dur: Math.random() * 2.5 + 2,
        delay: Math.random() * 1.5,
        isRound: Math.random() > 0.5,
      }));
      setConfettiPieces(pieces);
    }
  }, [isYouWinner]);

  // Compute standings
  const rankedPlayers = useMemo<RankedPlayer[]>(() => {
    const playersList = Object.values(gameState.players).map((p: any) => {
      const bankTotal =
        typeof p.bankTotal === "number"
          ? p.bankTotal
          : (p.bank || []).reduce((sum: number, c: CardInstance) => sum + (c.value || 0), 0);
      
      let propValue = 0;
      (p.propertySets || []).forEach((s: PropertySet) => {
        (s.cards || []).forEach((c: CardInstance) => {
          propValue += c.value || 0;
        });
        if (s.houseCard) propValue += s.houseCard.value || 0;
        if (s.hotelCard) propValue += s.hotelCard.value || 0;
      });

      const totalWealth = bankTotal + propValue;
      const completedSetsCount = (p.propertySets || []).filter((s: PropertySet) => s.isComplete).length;
      const isWinner = p.id === winnerId;

      return {
        id: p.id,
        name: p.name,
        isYou: p.id === currentPlayerId,
        isBot: !!p.isBot,
        bankTotal,
        completedSetsCount,
        propertySets: p.propertySets,
        totalWealth,
        isWinner,
      };
    });

    // Sort: Winner always 1st, then by completed sets, then by total wealth, then by bank
    playersList.sort((a, b) => {
      if (a.isWinner) return -1;
      if (b.isWinner) return 1;
      if (b.completedSetsCount !== a.completedSetsCount) {
        return b.completedSetsCount - a.completedSetsCount;
      }
      return b.totalWealth - a.totalWealth;
    });

    return playersList.map((p, idx) => ({
      ...p,
      rank: idx + 1,
    }));
  }, [gameState.players, winnerId, currentPlayerId]);

  // Compute highlights from history
  const highlights = useMemo<HighlightItem[]>(() => {
    const items: HighlightItem[] = [];

    let currentTurnNum = 1;
    gameState.history.forEach((evt) => {
      if (evt.type === "turn_started" && "turnNumber" in evt) {
        currentTurnNum = (evt as { turnNumber: number }).turnNumber;
      }

      const pName = evt.playerId ? gameState.players[evt.playerId]?.name || "A player" : "A player";
      const isYou = evt.playerId === currentPlayerId;
      const actorName = isYou ? "You" : pName;

      // 1. Action Played (Deal Breaker, Sly Deal, Force Deal, Debt Collector, Birthday)
      if (evt.type === "action_played" && "actionCard" in evt) {
        const action = (evt as { actionCard: CardInstance; targetPlayerId?: string }).actionCard;
        const targetName = (evt as { targetPlayerId?: string }).targetPlayerId
          ? gameState.players[(evt as { targetPlayerId?: string }).targetPlayerId!]?.name || "an opponent"
          : "";

        if (action.defId === "action-deal-breaker") {
          items.push({
            id: evt.id,
            turnNumber: currentTurnNum,
            icon: "gavel",
            iconBg: "rgba(239, 68, 68, 0.2)",
            iconColor: "#fca5a5",
            tag: "DEAL BREAKER",
            title: `${actorName} stole a full set!`,
            description: `${actorName} played Deal Breaker${targetName ? ` against ${targetName}` : ""}.`,
          });
        } else if (action.defId === "action-sly-deal") {
          items.push({
            id: evt.id,
            turnNumber: currentTurnNum,
            icon: "swords",
            iconBg: "rgba(249, 115, 22, 0.2)",
            iconColor: "#fdba74",
            tag: "SLY DEAL",
            title: `${actorName} stole a property`,
            description: `${actorName} snatched a card${targetName ? ` from ${targetName}` : ""}.`,
          });
        } else if (action.defId === "action-force-deal" || action.defId === "action-forced-deal") {
          items.push({
            id: evt.id,
            turnNumber: currentTurnNum,
            icon: "sync_alt",
            iconBg: "rgba(168, 200, 255, 0.2)",
            iconColor: "#a8c8ff",
            tag: "FORCE DEAL",
            title: `${actorName} forced a property swap`,
            description: `${actorName} traded properties${targetName ? ` with ${targetName}` : ""}.`,
          });
        } else if (action.defId === "action-debt-collector") {
          items.push({
            id: evt.id,
            turnNumber: currentTurnNum,
            icon: "payments",
            iconBg: "rgba(39, 166, 68, 0.2)",
            iconColor: "#66df75",
            tag: "DEBT COLLECTOR",
            title: `${actorName} collected $5M`,
            description: `${actorName} demanded $5M debt collection.`,
          });
        }
      }

      // 2. Rent Charged
      if (evt.type === "rent_charged" && "amount" in evt) {
        const rentEvt = evt as { amount: number; color?: string; isDoubled?: boolean };
        if (rentEvt.amount >= 3) {
          items.push({
            id: evt.id,
            turnNumber: currentTurnNum,
            icon: "payments",
            iconBg: "rgba(39, 166, 68, 0.2)",
            iconColor: "#66df75",
            tag: rentEvt.isDoubled ? "DOUBLE RENT" : "RENT",
            title: `${actorName} charged $${rentEvt.amount}M Rent`,
            description: `${rentEvt.isDoubled ? "Double rent! " : ""}Charged $${rentEvt.amount}M on ${rentEvt.color || "property"} set.`,
          });
        }
      }

      // 3. Property Set Completed
      if (evt.type === "property_played" && "setCompleted" in evt && (evt as { setCompleted: boolean }).setCompleted) {
        const propEvt = evt as { color?: string };
        items.push({
          id: evt.id,
          turnNumber: currentTurnNum,
          icon: "star",
          iconBg: "rgba(255, 183, 125, 0.2)",
          iconColor: "#ffb77d",
          tag: "SET COMPLETED",
          title: `${actorName} completed a set!`,
          description: `Formed a complete ${propEvt.color?.toUpperCase() || ""} property set.`,
        });
      }

      // 4. Just Say No
      if (evt.type === "reaction_submitted" && "reactionCard" in evt) {
        items.push({
          id: evt.id,
          turnNumber: currentTurnNum,
          icon: "shield",
          iconBg: "rgba(168, 200, 255, 0.2)",
          iconColor: "#a8c8ff",
          tag: "JUST SAY NO",
          title: `${actorName} played Just Say No!`,
          description: `Blocked an opponent's action with a reaction counter.`,
        });
      }
    });

    // Fallbacks if history had few events
    if (items.length === 0) {
      items.push({
        id: "fb-1",
        turnNumber: 1,
        icon: "stars",
        iconBg: "rgba(168, 200, 255, 0.2)",
        iconColor: "#a8c8ff",
        tag: "MATCH CONCLUSION",
        title: `${winner?.name || "Winner"} captured the victory!`,
        description: `Achieved 3 full property sets to claim the championship.`,
      });
    }

    return items.slice(-6).reverse();
  }, [gameState.history, gameState.players, currentPlayerId, winner]);

  const winnerRanked = rankedPlayers.find((p) => p.isWinner) || rankedPlayers[0];

  return (
    <div className="victory-page-wrapper">
      {/* Falling Confetti Particles for Winner */}
      {isYouWinner && (
        <div className="victory-confetti-container" aria-hidden="true">
          {confettiPieces.map((c) => (
            <div
              key={c.id}
              className="victory-confetti-piece"
              style={{
                left: `${c.left}vw`,
                backgroundColor: c.bg,
                animationDuration: `${c.dur}s`,
                animationDelay: `${c.delay}s`,
                borderRadius: c.isRound ? "50%" : "2px",
              }}
            />
          ))}
        </div>
      )}

      {/* Top App Bar Header */}
      <header className="victory-top-bar">
        <div className="victory-top-brand">
          <Link href="/" className="brand brand--app">
            <span className="brand-mark">D</span>
            <span>dealopoly</span>
          </Link>
        </div>
        <div className="victory-top-actions">
          <Link href="/lobby" className="victory-icon-btn" title="Back to Lobby">
            <span className="material-symbols-outlined">meeting_room</span>
          </Link>
          <Link href="/cards" className="victory-icon-btn" title="Card Catalogue">
            <span className="material-symbols-outlined">style</span>
          </Link>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="victory-main-container">
        {/* Hero Winner Showcase Banner */}
        <section className="victory-hero-section">
          <div className="victory-hero-glow" />
          <h1 className={`victory-hero-title ${isYouWinner ? "victory-hero-title--won" : "victory-hero-title--over"}`}>
            {isYouWinner ? "VICTORY" : "GAME OVER"}
          </h1>

          <div className="victory-winner-card">
            <div className="victory-avatar-wrapper">
              <div className="victory-avatar-circle">
                <span className={`avatar ${winnerRanked?.isYou ? "avatar--you" : winnerRanked?.isBot ? "avatar--pink" : "avatar--blue"}`} style={{ width: "100%", height: "100%", fontSize: "2.4rem" }}>
                  {winnerRanked?.name[0]?.toUpperCase() || "W"}
                </span>
              </div>
              <div className="victory-winner-pill">
                <span>WINNER!</span>
              </div>
            </div>

            <h2 className="victory-winner-name">
              {winnerRanked?.name} {winnerRanked?.isYou && "(You)"}
            </h2>

            <div className="victory-wealth-badge">
              <span className="victory-wealth-main">Total Wealth: ${winnerRanked?.totalWealth || 0}M</span>
              <span className="victory-wealth-sub">
                (${winnerRanked?.bankTotal || 0}M Bank • {winnerRanked?.completedSetsCount || 3} Sets Completed)
              </span>
            </div>
          </div>
        </section>

        {/* Standings and Highlights Grid */}
        <div className="victory-grid-layout">
          {/* Left Column: Final Standings Scoreboard */}
          <section className="victory-standings-panel">
            <div className="victory-panel-header">
              <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>
                leaderboard
              </span>
              <h3>Final Standings</h3>
            </div>

            {/* Desktop Table View */}
            <div className="victory-table-wrap victory-desktop-only">
              <table className="victory-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th style={{ textAlign: "right" }}>Bank Value</th>
                    <th style={{ textAlign: "right" }}>Sets Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedPlayers.map((p) => {
                    const isRank1 = p.rank === 1;
                    return (
                      <tr
                        key={p.id}
                        className={`victory-row ${isRank1 ? "victory-row--winner" : ""} ${p.isYou ? "victory-row--you" : ""}`}
                      >
                        <td className="victory-col-rank">
                          <span className={`victory-rank-badge victory-rank-badge--${p.rank}`}>
                            {p.rank === 1 ? "1st 👑" : p.rank === 2 ? "2nd" : p.rank === 3 ? "3rd" : `${p.rank}th`}
                          </span>
                        </td>
                        <td className="victory-col-player">
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span className={`avatar ${p.isYou ? "avatar--you" : p.isBot ? "avatar--pink" : "avatar--blue"}`} style={{ width: "30px", height: "30px", fontSize: "0.8rem" }}>
                              {p.name[0]?.toUpperCase()}
                            </span>
                            <div>
                              <strong style={{ display: "block", color: isRank1 ? "var(--primary)" : "var(--text)" }}>
                                {p.name} {p.isYou && "(You)"}
                              </strong>
                              {p.isBot && <small style={{ color: "var(--subtle)", fontSize: "0.68rem" }}>Bot AI</small>}
                            </div>
                          </div>
                        </td>
                        <td className="victory-col-bank" style={{ textAlign: "right" }}>
                          <span style={{ color: "#66df75", fontWeight: 800, fontFamily: "var(--mono)" }}>
                            ${p.bankTotal}M
                          </span>
                        </td>
                        <td className="victory-col-sets" style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                            <span style={{ fontWeight: 800, color: isRank1 ? "#ffd700" : "var(--text)" }}>
                              {p.completedSetsCount} / 3
                            </span>
                            {/* Set Color Dots */}
                            <div style={{ display: "flex", gap: "3px" }}>
                              {p.propertySets.map((s) => (
                                <span
                                  key={s.setId}
                                  title={`${s.color.toUpperCase()} (${s.cards.length}/${s.setSize})${s.isComplete ? " [Complete]" : ""}`}
                                  style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    backgroundColor: COLOR_CONFIG[s.color]?.hex || "#0055a4",
                                    border: s.isComplete ? "1.5px solid #FFFFFF" : "none",
                                    boxShadow: s.isComplete ? "0 0 4px rgba(255,255,255,0.6)" : "none",
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="victory-mobile-only victory-standings-cards">
              {rankedPlayers.map((p) => {
                const isRank1 = p.rank === 1;
                return (
                  <div
                    key={p.id}
                    className={`victory-mobile-player-card ${isRank1 ? "victory-mobile-player-card--winner" : ""}`}
                  >
                    <div className="victory-mobile-player-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className={`victory-rank-badge victory-rank-badge--${p.rank}`}>
                          {p.rank === 1 ? "1" : p.rank}
                        </span>
                        <span className={`avatar ${p.isYou ? "avatar--you" : p.isBot ? "avatar--pink" : "avatar--blue"}`} style={{ width: "32px", height: "32px", fontSize: "0.8rem" }}>
                          {p.name[0]?.toUpperCase()}
                        </span>
                        <div>
                          <strong style={{ fontSize: "0.95rem", color: isRank1 ? "var(--primary)" : "var(--text)" }}>
                            {p.name} {p.isYou && "(You)"}
                          </strong>
                          {isRank1 && (
                            <span style={{ display: "block", color: "#ffd700", fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase" }}>
                              👑 Champion
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#66df75", fontWeight: 800, fontSize: "1.05rem", fontFamily: "var(--mono)" }}>
                          ${p.bankTotal}M
                        </div>
                        <span style={{ fontSize: "0.72rem", color: isRank1 ? "#ffd700" : "var(--muted)", fontWeight: 700 }}>
                          {p.completedSetsCount} {p.completedSetsCount === 1 ? "Set" : "Sets"}
                        </span>
                      </div>
                    </div>

                    {/* Table property sets mini chips */}
                    {p.propertySets.length > 0 && (
                      <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}>
                        {p.propertySets.map((s) => (
                          <span
                            key={s.setId}
                            className="victory-set-chip"
                            style={{
                              backgroundColor: COLOR_CONFIG[s.color]?.hex || "#0055a4",
                              border: s.isComplete ? "2px solid #FFFFFF" : "1px solid rgba(255,255,255,0.2)",
                            }}
                          >
                            {s.color.toUpperCase()} ({s.cards.length}/${s.setSize}){s.isComplete && " ★"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right Column: Game Highlights */}
          <section className="victory-highlights-panel">
            <div className="victory-panel-header">
              <span className="material-symbols-outlined" style={{ color: "var(--tertiary)" }}>
                movie
              </span>
              <h3>Game Highlights</h3>
            </div>

            <div className="victory-highlights-list">
              {highlights.map((h) => (
                <div key={h.id} className="victory-highlight-card">
                  <div
                    className="victory-highlight-icon-wrap"
                    style={{ backgroundColor: h.iconBg, color: h.iconColor }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                      {h.icon}
                    </span>
                  </div>
                  <div className="victory-highlight-body">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                      <span className="victory-highlight-turn">
                        {h.turnNumber ? `Turn ${h.turnNumber}` : "Key Move"}
                      </span>
                      <span className="victory-highlight-tag" style={{ color: h.iconColor }}>
                        {h.tag}
                      </span>
                    </div>
                    <strong className="victory-highlight-title">{h.title}</strong>
                    <p className="victory-highlight-desc">{h.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Bottom Actions CTA */}
        <section className="victory-actions-section">
          {onPlayAgain ? (
            <button
              type="button"
              onClick={onPlayAgain}
              className="button button--primary victory-btn-play-again"
            >
              <span className="material-symbols-outlined">replay</span>
              <span>Play Again</span>
            </button>
          ) : (
            <Link
              href={roomCode ? `/lobby?room=${roomCode}` : "/lobby"}
              className="button button--primary victory-btn-play-again"
            >
              <span className="material-symbols-outlined">replay</span>
              <span>Play Again</span>
            </Link>
          )}

          <Link href="/lobby" className="button button--ghost victory-btn-lobby">
            <span className="material-symbols-outlined">meeting_room</span>
            <span>Return to Lobby</span>
          </Link>
        </section>
      </main>

      {/* Mobile Sticky Bottom Navigation */}
      <nav className="victory-mobile-bottom-nav">
        <Link href="/" className="victory-bottom-nav-item">
          <span className="material-symbols-outlined">home</span>
          <span>Home</span>
        </Link>
        <Link href="/lobby" className="victory-bottom-nav-item victory-bottom-nav-item--active">
          <span className="material-symbols-outlined">group</span>
          <span>Lobby</span>
        </Link>
        <Link href="/cards" className="victory-bottom-nav-item">
          <span className="material-symbols-outlined">style</span>
          <span>Cards</span>
        </Link>
      </nav>
    </div>
  );
}
