import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, games, rooms, players, eq, desc, sql } from "@dealopoly/db";
import { UserNav } from "../_components/user-nav";

export default async function MatchHistoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch past completed games
  const pastGames = await db
    .select({
      id: games.id,
      seed: games.seed,
      status: games.status,
      turnCount: games.turnCount,
      startedAt: games.startedAt,
      completedAt: games.completedAt,
      winnerId: games.winnerId,
      roomCode: rooms.code,
    })
    .from(games)
    .innerJoin(rooms, eq(games.roomId, rooms.id))
    .orderBy(desc(games.startedAt))
    .limit(20);

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
          <Link href="/profile">My Profile</Link>
          <Link href="/lobby">Play Game</Link>
        </nav>
        <div className="marketing-nav-actions">
          <UserNav />
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "48px 16px" }}>
        <div className="shell" style={{ maxWidth: "880px", margin: "0 auto" }}>
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontFamily: "var(--display)", fontSize: "2rem", fontWeight: 800, margin: "0 0 6px" }}>
              Match History
            </h1>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)", margin: 0 }}>
              Recent games and match logs across all Dealopoly rooms.
            </p>
          </div>

          {pastGames.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: "48px 24px",
                borderRadius: "20px",
                textAlign: "center",
                background: "var(--surface)",
                border: "1px solid var(--outline-variant)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "var(--subtle)", marginBottom: "12px" }}>
                sports_esports
              </span>
              <h3 style={{ margin: "0 0 8px" }}>No Games Recorded Yet</h3>
              <p style={{ color: "var(--muted)", maxWidth: "420px", margin: "0 auto 20px", fontSize: "0.88rem" }}>
                Start a game with friends or practice against bots to populate your match history.
              </p>
              <Link href="/lobby" className="button button--primary">
                Create a Room →
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {pastGames.map((match) => {
                const isCompleted = match.status === "completed";
                const dateStr = new Date(match.startedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={match.id}
                    className="glass-panel"
                    style={{
                      padding: "20px 24px",
                      borderRadius: "16px",
                      background: "var(--surface)",
                      border: "1px solid var(--outline-variant)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "12px",
                          background: isCompleted ? "rgba(102, 223, 117, 0.15)" : "rgba(168, 200, 255, 0.15)",
                          color: isCompleted ? "var(--green)" : "var(--primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                          {isCompleted ? "emoji_events" : "pending"}
                        </span>
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                            Room #{match.roomCode}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "0.68rem",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: isCompleted ? "rgba(102, 223, 117, 0.2)" : "rgba(255, 183, 125, 0.2)",
                              color: isCompleted ? "var(--green)" : "var(--tertiary)",
                              fontWeight: 600,
                            }}
                          >
                            {isCompleted ? "COMPLETED" : "IN PROGRESS"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                          {dateStr} • {match.turnCount} turns
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--subtle)", fontFamily: "var(--mono)" }}>
                        Seed: {match.seed}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
