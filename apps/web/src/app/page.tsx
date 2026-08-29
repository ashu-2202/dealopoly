"use client";

import Link from "next/link";
import { useState } from "react";
import { JoinRoomDialog } from "./_components/join-room-dialog";
import { HeroCardShowcase } from "./_components/hero-card-showcase";

const features = [
  {
    icon: "bolt",
    title: "Real-time Multiplayer",
    description:
      "Seamless sync across devices. See moves happen instantly without lag or waiting.",
    boxModifier: "feature-icon-box--blue",
  },
  {
    icon: "login",
    title: "No Sign-up Required",
    description:
      "Jump straight into the action. Play anonymously or connect an account later.",
    boxModifier: "feature-icon-box--green",
  },
  {
    icon: "menu_book",
    title: "Standard Rules",
    description:
      "Familiar mechanics with a modern twist. If you know the physical game, you're ready.",
    boxModifier: "feature-icon-box--amber",
  },
];

const howToPlaySteps = [
  {
    number: "1",
    title: "Draw Cards",
    description:
      "Start your turn by drawing 2 cards from the central deck to replenish your hand.",
  },
  {
    number: "2",
    title: "Play up to 3 Actions",
    description:
      "Lay down properties, bank cash, or play action cards to disrupt your opponents.",
  },
  {
    number: "3",
    title: "Collect 3 Sets",
    description:
      "Be the first player to complete 3 full property sets to instantly win the game.",
  },
];

export default function HomePage() {
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  return (
    <div className="marketing-page">
      {/* TopAppBar */}
      <header className="marketing-nav">
        <Link className="brand" href="/" aria-label="Dealopoly home">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            playing_cards
          </span>
          <span>dealopoly</span>
        </Link>

        <nav className="marketing-nav-center" aria-label="Main navigation">
          <Link href="/cards">Card Catalogue</Link>
          <a href="#how-to-play">How to play</a>
          <a href="#rules">Rules</a>
          <a href="#features">About</a>
        </nav>

        <div className="marketing-nav-actions">
          <button type="button" className="nav-action-btn" aria-label="Help">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>help</span>
          </button>
          <button type="button" className="nav-action-btn" aria-label="Settings">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>settings</span>
          </button>
          <div className="user-avatar-badge" title="Guest Player">
            YP
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="hero-section shell hero-pattern" aria-labelledby="page-title">
          {/* Hero Copy & 3 Actions */}
          <div className="hero-copy">
            <div className="hero-badge">
              <span className="badge-dot" />
              <span className="badge-text">Servers Online • 1,204 Players</span>
            </div>

            <h1 id="page-title" className="text-glow">
              Deal Your Way to <span className="glow-word">Victory</span>
            </h1>

            <p className="lede">
              Experience the ruthless, fast-paced card game where properties change
              hands, debt collectors knock, and sly deals win the day. No setup required.
            </p>

            {/* 3 Hero Action Buttons */}
            <div className="hero-actions">
              {/* Action 1: Create Room */}
              <Link className="button button--primary" href="/lobby">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: "22px" }}>
                  add_circle
                </span>
                Create Room
              </Link>

              {/* Action 2: Join Room (Modal / Bottom Sheet trigger) */}
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
              <Link className="button button--ghost" href="/game">
                <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                  smart_toy
                </span>
                Play with Bots
              </Link>
            </div>

            <p className="availability">
              <span className="online-dot" /> No account needed. Start playing in seconds.
            </p>
          </div>

          {/* Hero Interactive 3D Card Showcase */}
          <HeroCardShowcase />
        </section>

        {/* Features Section */}
        <section id="features" className="features-section" aria-label="Game highlights">
          <div className="shell">
            <div className="features-grid">
              {features.map((f) => (
                <article className="feature-card glass-panel" key={f.title}>
                  <div className={`feature-icon-box ${f.boxModifier}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>
                      {f.icon}
                    </span>
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How to Play Section */}
        <section id="how-to-play" className="how-to-play-section shell" aria-labelledby="how-title">
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

      {/* Footer */}
      <footer className="marketing-footer">
        <div className="shell footer-inner">
          <div className="footer-brand-wrap">
            <span className="brand" style={{ fontSize: "1.1rem" }}>
              dealopoly
            </span>
            <span className="footer-version">v1.2.0</span>
          </div>

          <p>© 2026 Dealopoly. Deal your way to victory.</p>

          <div className="footer-links">
            <a href="#how-to-play">How to play</a>
            <a href="#rules">Rules</a>
            <a href="#features">Support</a>
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
    </div>
  );
}
