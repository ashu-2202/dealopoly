"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { fetchStatsApi, type ServerStats } from "../lib/api";
import { MarketingNav } from "./_components/marketing-nav";
import { JoinRoomDialog } from "./_components/join-room-dialog";
import { PlayBotsDialog } from "./_components/play-bots-dialog";
import { SkyscraperBackdrop } from "./_components/skyscraper-backdrop";

const platformFeatures = [
  {
    icon: "bolt",
    tag: "INSTANT SYNC",
    title: "Zero-Lag Multiplayer",
    description: "Seamless real-time WebSocket sync. Play on desktop, tablet, or phone with instant response.",
    themeClass: "feature-card--blue",
    boxModifier: "feature-icon-box--blue",
  },
  {
    icon: "smart_toy",
    tag: "SMART AI",
    title: "Instant Solo Play",
    description: "Practice your tactics against heuristic AI bots anytime with zero setup or waiting.",
    themeClass: "feature-card--green",
    boxModifier: "feature-icon-box--green",
  },
  {
    icon: "style",
    tag: "MULTIPLE GAMES",
    title: "Expanding Arcade",
    description: "Switch seamlessly between Monodeal property trading and Lowdeck point-shedding bluffing.",
    themeClass: "feature-card--amber",
    boxModifier: "feature-icon-box--amber",
  },
];

export default function ArcadeLauncherPage() {
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isBotsOpen, setIsBotsOpen] = useState(false);
  const [defaultGameForBots, setDefaultGameForBots] = useState<"monodeal" | "least_count">("monodeal");
  const [stats, setStats] = useState<ServerStats | null>(null);

  useEffect(() => {
    fetchStatsApi().then(setStats).catch(() => {});
    const interval = setInterval(() => {
      fetchStatsApi().then(setStats).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const serversOnline = stats ? stats.serversOnline : true;
  const statusText = serversOnline ? "Servers Online" : "Instant Play Ready";
  const playerLabel = stats
    ? stats.onlinePlayers > 0
      ? `${stats.onlinePlayers.toLocaleString()} ${stats.onlinePlayers === 1 ? "Player" : "Players"} Online`
      : `${Math.max(stats.totalPlayers, 1).toLocaleString()} ${Math.max(stats.totalPlayers, 1) === 1 ? "Player" : "Players"}`
    : "1 Player Online";

  const handleOpenBots = (game: "monodeal" | "least_count") => {
    setDefaultGameForBots(game);
    setIsBotsOpen(true);
  };

  return (
    <div className="marketing-page">
      {/* Top Arcade Navigation */}
      <MarketingNav game="arcade" activeTab="home" />

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="hero-section shell hero-pattern" style={{ textAlign: "center", padding: "48px 16px 36px" }}>
          <div style={{ maxWidth: "860px", margin: "0 auto" }}>
            <div className="hero-badge" style={{ margin: "0 auto 16px" }}>
              <span className="badge-dot" style={{ background: "#10b981" }} />
              <span className="badge-text">{statusText} • {playerLabel}</span>
            </div>

            <h1 className="text-glow" style={{ fontSize: "clamp(2.4rem, 6vw, 3.8rem)", fontWeight: 900, lineHeight: 1.1, margin: "0 0 16px" }}>
              The Real-Time <span className="glow-word">Card Arcade</span>
            </h1>

            <p className="lede" style={{ maxWidth: "680px", margin: "0 auto 28px", fontSize: "1.1rem", color: "#cbd5e1" }}>
              Instant-play multiplayer card battles with friends and smart AI bots. No downloads or sign-ups required. Select a game below to jump straight in!
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <a href="#games" className="button button--primary" style={{ padding: "12px 28px", fontSize: "1rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>sports_esports</span>
                Browse Games
              </a>
              <button
                type="button"
                onClick={() => setIsJoinOpen(true)}
                className="button button--secondary"
                style={{ padding: "12px 24px", fontSize: "1rem" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>login</span>
                Join by Room Code
              </button>
            </div>
          </div>
        </section>

        {/* Multi-Game Launcher Showcase Grid */}
        <section id="games" className="shell" style={{ padding: "32px 16px 48px" }}>
          <div className="section-header" style={{ textAlign: "center", marginBottom: "36px" }}>
            <p className="kicker">SELECT YOUR GAME</p>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 900 }}>Arcade Game Launcher</h2>
            <p style={{ color: "#94a3b8" }}>Pick a card game to view its full game hub, cards, rules, or start playing immediately.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "28px" }}>
            {/* Game Card 1: Monodeal */}
            <div
              className="game-launcher-card"
              style={{
                background: "linear-gradient(145deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)",
                border: "1.5px solid rgba(56, 189, 248, 0.35)",
                borderRadius: "20px",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 16px 36px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.15)",
                position: "relative",
                overflow: "hidden",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              <div style={{ position: "absolute", top: "18px", right: "18px" }}>
                <span className="badge" style={{ background: "rgba(56, 189, 248, 0.18)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.4)", fontWeight: 800 }}>
                  2–5 PLAYERS
                </span>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "2.4rem" }}>🃏</span>
                  <div>
                    <h3 style={{ fontSize: "1.6rem", fontWeight: 900, color: "#f8fafc", margin: 0 }}>Monodeal</h3>
                    <span style={{ fontSize: "0.80rem", color: "#38bdf8", fontWeight: 700, letterSpacing: "0.04em" }}>
                      Deal Your Way to Victory
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: "0.90rem", color: "#94a3b8", lineHeight: 1.6, margin: "14px 0 18px" }}>
                  The authentic real-estate card trading game. Collect 3 full property sets, charge ruthless rent, and steal properties with Deal Breakers!
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
                  <span style={{ fontSize: "0.74rem", background: "rgba(255,255,255,0.06)", padding: "4px 10px", borderRadius: "6px", color: "#cbd5e1" }}>⏱️ 10–15 Mins</span>
                  <span style={{ fontSize: "0.74rem", background: "rgba(255,255,255,0.06)", padding: "4px 10px", borderRadius: "6px", color: "#cbd5e1" }}>🎴 110 Cards</span>
                  <span style={{ fontSize: "0.74rem", background: "rgba(255,255,255,0.06)", padding: "4px 10px", borderRadius: "6px", color: "#cbd5e1" }}>🏢 Real Estate Strategy</span>
                </div>
              </div>

              <div>
                <Link
                  href="/monodeal"
                  className="button button--primary button--full"
                  style={{ justifyContent: "center", marginBottom: "10px", padding: "12px 18px" }}
                >
                  Enter Monodeal Hub ➔
                </Link>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleOpenBots("monodeal")}
                    className="button button--ghost button--sm"
                    style={{ justifyContent: "center" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>smart_toy</span>
                    Play Bots
                  </button>
                  <Link
                    href="/lobby?game=monodeal"
                    className="button button--secondary button--sm"
                    style={{ justifyContent: "center" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add_circle</span>
                    Create Room
                  </Link>
                </div>
              </div>
            </div>

            {/* Game Card 2: Lowdeck */}
            <div
              className="game-launcher-card"
              style={{
                background: "linear-gradient(145deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)",
                border: "1.5px solid rgba(234, 179, 8, 0.4)",
                borderRadius: "20px",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 16px 36px rgba(0, 0, 0, 0.5), 0 0 20px rgba(234, 179, 8, 0.15)",
                position: "relative",
                overflow: "hidden",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              <div style={{ position: "absolute", top: "18px", right: "18px" }}>
                <span className="badge" style={{ background: "rgba(234, 179, 8, 0.18)", color: "#facc15", border: "1px solid rgba(234, 179, 8, 0.4)", fontWeight: 800 }}>
                  2–6 PLAYERS
                </span>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "2.4rem" }}>🎯</span>
                  <div>
                    <h3 style={{ fontSize: "1.6rem", fontWeight: 900, color: "#f8fafc", margin: 0 }}>Lowdeck</h3>
                    <span style={{ fontSize: "0.80rem", color: "#facc15", fontWeight: 700, letterSpacing: "0.04em" }}>
                      Less Points. More Glory.
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: "0.90rem", color: "#94a3b8", lineHeight: 1.6, margin: "14px 0 18px" }}>
                  The ultimate point-shedding and bluffing showdown. Discard pairs & runs, hold 0-point Kings, and call SHOW when hand total ≤ 7!
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
                  <span style={{ fontSize: "0.74rem", background: "rgba(255,255,255,0.06)", padding: "4px 10px", borderRadius: "6px", color: "#cbd5e1" }}>⏱️ 5–10 Mins</span>
                  <span style={{ fontSize: "0.74rem", background: "rgba(255,255,255,0.06)", padding: "4px 10px", borderRadius: "6px", color: "#cbd5e1" }}>👑 King = 0 pts</span>
                  <span style={{ fontSize: "0.74rem", background: "rgba(255,255,255,0.06)", padding: "4px 10px", borderRadius: "6px", color: "#cbd5e1" }}>💥 +40 Penalty</span>
                </div>
              </div>

              <div>
                <Link
                  href="/lowdeck"
                  className="button button--primary button--full"
                  style={{
                    justifyContent: "center",
                    marginBottom: "10px",
                    padding: "12px 18px",
                    background: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
                    color: "#0f172a",
                    fontWeight: 900,
                  }}
                >
                  Enter Lowdeck Hub ➔
                </Link>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleOpenBots("least_count")}
                    className="button button--ghost button--sm"
                    style={{ justifyContent: "center" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>smart_toy</span>
                    Play Bots
                  </button>
                  <Link
                    href="/lobby?game=least_count"
                    className="button button--secondary button--sm"
                    style={{ justifyContent: "center" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add_circle</span>
                    Create Room
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global Platform Features */}
        <section id="features" className="features-section" aria-label="Arcade features">
          <div className="shell">
            <div className="features-grid">
              {platformFeatures.map((f) => (
                <article className={`feature-card ${f.themeClass}`} key={f.title}>
                  <div className="feature-card-header">
                    <div className={`feature-icon-box ${f.boxModifier}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: "26px", fontVariationSettings: "'FILL' 1" }}>
                        {f.icon}
                      </span>
                    </div>
                    <span className="feature-card-tag">{f.tag}</span>
                  </div>
                  <div className="feature-card-content">
                    <h3>{f.title}</h3>
                    <p>{f.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Join Room Modal Dialog */}
      <JoinRoomDialog isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} />

      {/* Play With Bots Modal Dialog */}
      <PlayBotsDialog
        isOpen={isBotsOpen}
        onClose={() => setIsBotsOpen(false)}
        defaultGame={defaultGameForBots}
      />
    </div>
  );
}
