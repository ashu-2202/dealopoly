"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { fetchStatsApi, type ServerStats } from "../lib/api";
import { MarketingNav } from "./_components/marketing-nav";
import { JoinRoomDialog } from "./_components/join-room-dialog";
import { PlayBotsDialog } from "./_components/play-bots-dialog";
import { HeroCardShowcase } from "./_components/hero-card-showcase";
import { LeastCountHeroShowcase } from "./_components/least-count-hero-showcase";
import { SkyscraperBackdrop } from "./_components/skyscraper-backdrop";

const features = [
  {
    icon: "bolt",
    tag: "INSTANT SYNC",
    title: "Real-time Multiplayer",
    description:
      "Seamless sync across devices. See moves happen instantly without lag or waiting.",
    themeClass: "feature-card--blue",
    boxModifier: "feature-icon-box--blue",
  },
  {
    icon: "login",
    tag: "ZERO FRICTION",
    title: "No Sign-up Required",
    description:
      "Jump straight into the action. Play anonymously or connect an account later.",
    themeClass: "feature-card--green",
    boxModifier: "feature-icon-box--green",
  },
  {
    icon: "style",
    tag: "MULTI-GAME ARCADE",
    title: "Multiple Card Games",
    description:
      "Play Monodeal property trading or Least Count point-shedding bluffing, all in one place.",
    themeClass: "feature-card--amber",
    boxModifier: "feature-icon-box--amber",
  },
];

const howToPlaySteps = [
  {
    number: "1",
    title: "Draw Cards",
    description:
      "Start your turn by drawing from the central deck or discard pile to strengthen your hand.",
  },
  {
    number: "2",
    title: "Play Actions & Discard",
    description:
      "Lay down properties, build runs/sets, bank cash, or shed points with matching pairs.",
  },
  {
    number: "3",
    title: "Claim Victory",
    description:
      "Complete 3 full sets in Monodeal, or call SHOW with lowest hand count to win!",
  },
];

export default function HomePage() {
  const [activeGame, setActiveGame] = useState<"monodeal" | "least_count">("monodeal");
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isBotsOpen, setIsBotsOpen] = useState(false);
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

  return (
    <div className="marketing-page">
      {/* TopAppBar */}
      <MarketingNav activeTab="home" />

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="hero-section shell hero-pattern" aria-labelledby="page-title">
          {/* Hero Copy & Actions */}
          <div className="hero-copy">
            {/* Game Selector Switcher */}
            <div
              style={{
                display: "inline-flex",
                gap: "6px",
                margin: "0 auto 8px",
                background: "rgba(15, 23, 42, 0.85)",
                padding: "3px",
                borderRadius: "999px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveGame("monodeal")}
                className={`button button--sm ${activeGame === "monodeal" ? "button--primary" : "button--ghost"}`}
                style={{ borderRadius: "999px", padding: "4px 12px", fontSize: "0.76rem" }}
              >
                🃏 Monodeal
              </button>
              <button
                type="button"
                onClick={() => setActiveGame("least_count")}
                className={`button button--sm ${activeGame === "least_count" ? "button--primary" : "button--ghost"}`}
                style={{ borderRadius: "999px", padding: "4px 12px", fontSize: "0.76rem" }}
              >
                🎯 Least Count
              </button>
            </div>

            <div className="hero-badge">
              <span
                className="badge-dot"
                style={{
                  background: serversOnline ? "#10b981" : "#10b981",
                }}
              />
              <span className="badge-text">
                {statusText} • {playerLabel}
              </span>
            </div>

            {activeGame === "monodeal" ? (
              <>
                <h1 id="page-title" className="text-glow">
                  Deal Your Way to <span className="glow-word">Victory</span>
                </h1>
                <p className="lede">
                  Experience the ruthless, fast-paced property trading card game where properties change
                  hands, debt collectors knock, and sly deals win the day.
                </p>
              </>
            ) : (
              <>
                <h1 id="page-title" className="text-glow">
                  Shed Your Points to <span className="glow-word">Victory</span>
                </h1>
                <p className="lede">
                  The ultimate bluffing & point-shedding card showdown. Drop pairs and sequences,
                  hold 0-point Kings, and declare SHOW to outsmart your opponents.
                </p>
              </>
            )}

            {/* 3 Hero Action Buttons */}
            <div className="hero-actions">
              {/* Action 1: Create Room */}
              <Link className="button button--primary" href={`/lobby?game=${activeGame}`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: "22px" }}>
                  add_circle
                </span>
                Create Room
              </Link>

              {/* Action 2: Join Room */}
              <button
                type="button"
                onClick={() => setIsJoinOpen(true)}
                className="button button--secondary"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                  login
                </span>
                Join Room
              </button>

              {/* Action 3: Play with Bots */}
              <button
                type="button"
                onClick={() => setIsBotsOpen(true)}
                className="button button--ghost"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                  smart_toy
                </span>
                Play with Bots
              </button>
            </div>

            <p className="availability">
              <span className="online-dot" /> No account needed. Start playing in seconds.
            </p>
          </div>

          {/* Hero Interactive 3D Card Showcase */}
          {activeGame === "monodeal" ? <HeroCardShowcase /> : <LeastCountHeroShowcase />}
        </section>

        {/* Arcade Games Catalogue Section */}
        <section id="games" className="shell" style={{ padding: "40px 16px 20px" }}>
          <div className="section-header" style={{ textAlign: "center", marginBottom: "32px" }}>
            <p className="kicker">DEALOPOLY ARCADE</p>
            <h2>Choose Your Game</h2>
            <p>Jump into ruthless property trading or intense point-shedding bluffing.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            {/* Game Card 1: Monodeal */}
            <div
              style={{
                background: "linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
                border: "1.5px solid rgba(56, 189, 248, 0.25)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: "16px", right: "16px" }}>
                <span className="badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                  2–5 PLAYERS
                </span>
              </div>
              <div>
                <div style={{ fontSize: "2.2rem", marginBottom: "8px" }}>🃏</div>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#f8fafc", margin: "0 0 8px" }}>Monodeal</h3>
                <p style={{ fontSize: "0.88rem", color: "#94a3b8", lineHeight: 1.5, marginBottom: "16px" }}>
                  The authentic real-estate card trading game. Collect 3 full property sets, charge ruthless rent, and steal properties with Deal Breakers!
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
                  <span style={{ fontSize: "0.72rem", background: "rgba(255,255,255,0.06)", padding: "4px 8px", borderRadius: "6px", color: "#cbd5e1" }}>⏱️ 10–15 Mins</span>
                  <span style={{ fontSize: "0.72rem", background: "rgba(255,255,255,0.06)", padding: "4px 8px", borderRadius: "6px", color: "#cbd5e1" }}>🎴 110 Cards</span>
                  <span style={{ fontSize: "0.72rem", background: "rgba(255,255,255,0.06)", padding: "4px 8px", borderRadius: "6px", color: "#cbd5e1" }}>🏢 Real Estate</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <Link href="/game?mode=bot&game=monodeal" className="button button--primary button--sm" style={{ flex: 1, justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>smart_toy</span>
                  Play Bots
                </Link>
                <Link href="/lobby?game=monodeal" className="button button--secondary button--sm" style={{ flex: 1, justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add_circle</span>
                  Create Room
                </Link>
              </div>
            </div>

            {/* Game Card 2: Least Count */}
            <div
              style={{
                background: "linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
                border: "1.5px solid rgba(234, 179, 8, 0.3)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: "16px", right: "16px" }}>
                <span className="badge" style={{ background: "rgba(234, 179, 8, 0.15)", color: "#facc15", border: "1px solid rgba(234, 179, 8, 0.3)" }}>
                  2–6 PLAYERS
                </span>
              </div>
              <div>
                <div style={{ fontSize: "2.2rem", marginBottom: "8px" }}>🎯</div>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#f8fafc", margin: "0 0 8px" }}>Least Count</h3>
                <p style={{ fontSize: "0.88rem", color: "#94a3b8", lineHeight: 1.5, marginBottom: "16px" }}>
                  The ultimate point-shedding and bluffing showdown. Discard pairs & runs, hold 0-point Kings, and call SHOW when hand total ≤ 7!
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
                  <span style={{ fontSize: "0.72rem", background: "rgba(255,255,255,0.06)", padding: "4px 8px", borderRadius: "6px", color: "#cbd5e1" }}>⏱️ 5–10 Mins</span>
                  <span style={{ fontSize: "0.72rem", background: "rgba(255,255,255,0.06)", padding: "4px 8px", borderRadius: "6px", color: "#cbd5e1" }}>👑 King = 0 pts</span>
                  <span style={{ fontSize: "0.72rem", background: "rgba(255,255,255,0.06)", padding: "4px 8px", borderRadius: "6px", color: "#cbd5e1" }}>💥 +40 Penalty</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <Link href="/game?mode=bot&game=least_count" className="button button--primary button--sm" style={{ flex: 1, justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>smart_toy</span>
                  Play Bots
                </Link>
                <Link href="/lobby?game=least_count" className="button button--secondary button--sm" style={{ flex: 1, justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add_circle</span>
                  Create Room
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features-section" aria-label="Game highlights">
          <div className="shell">
            <div className="features-grid">
              {features.map((f) => (
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

        {/* How to Play Section with Skyscraper Architectural Backdrop */}
        <section id="how-to-play" className="how-to-play-section" aria-labelledby="how-title">
          {/* Architectural Skyscraper Skyline Background Sketch */}
          <SkyscraperBackdrop />

          <div className="shell how-to-play-content">
            <div className="section-header">
              <p className="kicker">QUICK TO LEARN</p>
              <h2 id="how-title">How to play</h2>
              <p>Three simple steps to dominate the board.</p>
            </div>

            <div className="steps-grid">
              <div className="steps-connector" aria-hidden="true" />
              {howToPlaySteps.map((step) => (
                <article className="step-card" key={step.number}>
                  <div className="step-number-box">{step.number}</div>
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Rules Callout Banner */}
        <section id="rules" className="rules-banner-section shell">
          <div className="rules-banner-card">
            <div>
              <p className="kicker">BUILT FOR THE TABLE</p>
              <h2>Everything you need for a great game night.</h2>
            </div>
            <Link className="button button--primary" href="/lobby">
              Create a room →
            </Link>
          </div>
        </section>
      </main>

      {/* Footer with Full-Width Skyscraper Skyline Backdrop */}
      <footer className="marketing-footer">
        <SkyscraperBackdrop className="footer-skyscraper-backdrop" />
        <div className="shell footer-inner">
          <div className="footer-brand-wrap">
            <span className="brand" style={{ fontSize: "1.1rem" }}>
              dealopoly
            </span>
            <span className="footer-version">v1.2.0</span>
          </div>

          <p>© 2026 Dealopoly. Deal your way to victory.</p>

          <div className="footer-links">
            <Link href="/how-to-play">How to play</Link>
            <Link href="/how-to-play#rules">Rules</Link>
            <a href="#features">About</a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              style={{ display: "inline-flex", alignItems: "center" }}
            >
              <svg style={{ width: "18px", height: "18px", fill: "currentColor" }} viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Join Room Dialog (Desktop Modal + Mobile Bottom Sheet) */}
      <JoinRoomDialog
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />

      {/* Play with Bots Setup Dialog */}
      <PlayBotsDialog
        isOpen={isBotsOpen}
        onClose={() => setIsBotsOpen(false)}
      />
    </div>
  );
}
