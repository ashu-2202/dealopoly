"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

export function Brand() {
  return (
    <Link className="brand brand--app" href="/">
      <span className="brand-mark">D</span>
      <span>dealopoly</span>
    </Link>
  );
}

export function AppShell({
  active,
  children,
}: {
  active: "lobby" | "play";
  children: ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Mobile Top Bar */}
      <header className="app-mobile-topbar">
        <Brand />
        <button
          type="button"
          className="app-mobile-menu-btn"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="app-mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`app-sidebar ${mobileMenuOpen ? "app-sidebar--open" : ""}`}>
        <Brand />
        <div className="profile">
          <span className="avatar avatar--you">Y</span>
          <div>
            <strong>You</strong>
            <small>Guest player</small>
          </div>
          <span className="status-dot" />
        </div>
        <Link className="new-game" href="/lobby" onClick={() => setMobileMenuOpen(false)}>
          ＋ New game
        </Link>
        <nav className="app-nav" aria-label="Game navigation">
          <Link
            className={active === "lobby" ? "active" : ""}
            href="/lobby"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>▦</span> Rooms
          </Link>
          <Link
            className={active === "play" ? "active" : ""}
            href="/game"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>♠</span> Play
          </Link>
          <Link href="/cards" onClick={() => setMobileMenuOpen(false)}>
            <span>🂠</span> Cards
          </Link>
          <a href="#friends">
            <span>♧</span> Friends
          </a>
          <a href="#history">
            <span>◷</span> History
          </a>
        </nav>
        <a className="settings-link" href="#settings">
          ⚙ Settings
        </a>
      </aside>

      <section className="app-stage">{children}</section>
    </div>
  );
}
