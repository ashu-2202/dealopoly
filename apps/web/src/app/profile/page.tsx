import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, users, eq } from "@dealopoly/db";
import { UserNav } from "../_components/user-nav";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch full user record from Neon Postgres
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const dbUser = userRows[0];
  const name = dbUser?.name ?? session.user.name ?? "Player";
  const email = dbUser?.email ?? session.user.email ?? "";
  const image = dbUser?.image ?? session.user.image ?? null;
  const gamesPlayed: number = Number(dbUser?.gamesPlayed ?? 0);
  const gamesWon: number = Number(dbUser?.gamesWon ?? 0);
  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
  const customTag: string = dbUser?.customTag ?? `@${name}`;

  return (
    <div className="marketing-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navigation */}
      <header className="marketing-nav">
        <Link className="brand" href="/" aria-label="Dealopoly home">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            playing_cards
          </span>
          <span>dealopoly</span>
        </Link>
        <nav className="marketing-nav-center" aria-label="Main navigation">
          <Link href="/cards">Card Catalogue</Link>
          <Link href="/history">Match History</Link>
          <Link href="/lobby">Play Game</Link>
        </nav>
        <div className="marketing-nav-actions">
          <UserNav />
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "48px 16px" }}>
        <div className="shell" style={{ maxWidth: "880px", margin: "0 auto" }}>
          {/* Profile Header Card */}
          <div
            className="glass-panel"
            style={{
              padding: "36px",
              borderRadius: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "24px",
              flexWrap: "wrap",
              marginBottom: "32px",
              background: "linear-gradient(135deg, rgba(29, 32, 33, 0.9) 0%, rgba(0, 48, 97, 0.4) 100%)",
              border: "1px solid rgba(168, 200, 255, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              {image ? (
                <img
                  src={image}
                  alt={name}
                  style={{
                    width: "84px",
                    height: "84px",
                    borderRadius: "50%",
                    border: "3px solid var(--primary)",
                    objectFit: "cover",
                    boxShadow: "0 8px 24px rgba(0, 85, 164, 0.4)",
                  }}
                />
              ) : (
                <div
                  className="user-avatar-badge"
                  style={{
                    width: "84px",
                    height: "84px",
                    borderRadius: "50%",
                    fontSize: "2rem",
                    fontWeight: 800,
                    background: "linear-gradient(135deg, #0055A4 0%, #27A644 100%)",
                    color: "#fff",
                    border: "3px solid var(--primary)",
                    boxShadow: "0 8px 24px rgba(0, 85, 164, 0.4)",
                  }}
                >
                  {name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <h1 style={{ fontFamily: "var(--display)", fontSize: "1.85rem", fontWeight: 800, margin: 0 }}>
                    {name}
                  </h1>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "0.72rem",
                      background: "rgba(102, 223, 117, 0.15)",
                      color: "var(--green)",
                      border: "1px solid rgba(102, 223, 117, 0.3)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontWeight: 600,
                    }}
                  >
                    PRO PLAYER
                  </span>
                </div>
                <p style={{ fontFamily: "var(--mono)", fontSize: "0.85rem", color: "var(--primary)", margin: "0 0 6px" }}>
                  {customTag}
                </p>
                <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0 }}>
                  {email}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <Link href="/lobby" className="button button--primary" style={{ padding: "10px 20px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}>
                  play_arrow
                </span>
                Play Now
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
              marginBottom: "36px",
            }}
          >
            {/* Games Played */}
            <div
              className="glass-panel"
              style={{
                padding: "24px",
                borderRadius: "18px",
                border: "1px solid var(--outline-variant)",
                background: "var(--surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "0.8rem", fontFamily: "var(--mono)", color: "var(--muted)", fontWeight: 600 }}>
                  MATCHES PLAYED
                </span>
                <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: "22px" }}>
                  sports_esports
                </span>
              </div>
              <div style={{ fontSize: "2.4rem", fontWeight: 800, fontFamily: "var(--display)" }}>
                {gamesPlayed}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--subtle)", marginTop: "4px" }}>
                Lifetime matches recorded
              </div>
            </div>

            {/* Games Won */}
            <div
              className="glass-panel"
              style={{
                padding: "24px",
                borderRadius: "18px",
                border: "1px solid var(--outline-variant)",
                background: "var(--surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "0.8rem", fontFamily: "var(--mono)", color: "var(--muted)", fontWeight: 600 }}>
                  VICTORIES
                </span>
                <span className="material-symbols-outlined" style={{ color: "var(--green)", fontSize: "22px", fontVariationSettings: "'FILL' 1" }}>
                  emoji_events
                </span>
              </div>
              <div style={{ fontSize: "2.4rem", fontWeight: 800, fontFamily: "var(--display)", color: "var(--green)" }}>
                {gamesWon}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--subtle)", marginTop: "4px" }}>
                Total 3-set monopoly wins
              </div>
            </div>

            {/* Win Rate */}
            <div
              className="glass-panel"
              style={{
                padding: "24px",
                borderRadius: "18px",
                border: "1px solid var(--outline-variant)",
                background: "var(--surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "0.8rem", fontFamily: "var(--mono)", color: "var(--muted)", fontWeight: 600 }}>
                  WIN RATE
                </span>
                <span className="material-symbols-outlined" style={{ color: "var(--tertiary)", fontSize: "22px" }}>
                  percent
                </span>
              </div>
              <div style={{ fontSize: "2.4rem", fontWeight: 800, fontFamily: "var(--display)", color: "var(--tertiary)" }}>
                {winRate}%
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--subtle)", marginTop: "4px" }}>
                Performance across all rooms
              </div>
            </div>
          </div>

          {/* Quick Links Section */}
          <div
            className="glass-panel"
            style={{
              padding: "28px 32px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(29, 32, 33, 0.8)",
              border: "1px solid var(--line)",
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "1.1rem" }}>Looking for past match logs?</h3>
              <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--muted)" }}>
                View complete move-by-move histories and stats from previous games.
              </p>
            </div>
            <Link href="/history" className="button button--secondary">
              View Match History →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
