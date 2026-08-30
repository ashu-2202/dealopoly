import React from "react";
import Link from "next/link";
import { MarketingNav } from "../_components/marketing-nav";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, games, rooms, roomSeats, players, eq, inArray, desc } from "@dealopoly/db";
import { BackButton } from "../_components/back-button";

export default async function MatchHistoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // 1. Find all player IDs associated with this user
  const userPlayerRows = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.userId, userId));

  const userPlayerIds = userPlayerRows.map((p) => p.id);
  const userPlayerIdSet = new Set(userPlayerIds);

  let pastGames: Array<{
    id: string;
    seed: number;
    status: string;
    turnCount: number;
    startedAt: Date;
    completedAt: Date | null;
    winnerId: string | null;
    roomCode: string;
    isVictory: boolean;
  }> = [];

  if (userPlayerIds.length > 0) {
    // 2. Find all rooms where the user was a seated player or the room host
    const userSeats = await db
      .select({ roomId: roomSeats.roomId })
      .from(roomSeats)
      .where(inArray(roomSeats.playerId, userPlayerIds));

    const hostRooms = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(inArray(rooms.hostPlayerId, userPlayerIds));

    const allUserRoomIds = Array.from(
      new Set([
        ...userSeats.map((s) => s.roomId),
        ...hostRooms.map((r) => r.id),
      ])
    );

    if (allUserRoomIds.length > 0) {
      // 3. Fetch past games for this user's rooms only
      const rawGames = await db
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
        .where(inArray(games.roomId, allUserRoomIds))
        .orderBy(desc(games.startedAt))
        .limit(40);

      pastGames = rawGames.map((g) => ({
        ...g,
        isVictory: g.winnerId ? userPlayerIdSet.has(g.winnerId) : false,
      }));
    }
  }

  const victoriesCount = pastGames.filter((g) => g.status === "completed" && g.isVictory).length;
  const defeatsCount = pastGames.filter((g) => g.status === "completed" && !g.isVictory).length;

  return (
    <div className="marketing-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navigation */}
      <MarketingNav activeTab="history" />

      {/* Main Content */}
      <main style={{ flex: 1, padding: "48px 16px" }}>
        <div className="shell" style={{ maxWidth: "880px", margin: "0 auto" }}>
          <div style={{ marginBottom: "28px" }}>
            <BackButton fallbackUrl="/profile" label="Back to Profile" variant="subtle" style={{ marginBottom: "12px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h1 style={{ fontFamily: "var(--display)", fontSize: "2rem", fontWeight: 800, margin: "0 0 6px" }}>
                  Match History
                </h1>
                <p style={{ fontSize: "0.9rem", color: "var(--muted)", margin: 0 }}>
                  Your personal match logs and game outcomes across Dealopoly rooms.
                </p>
              </div>

              {pastGames.length > 0 && (
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "8px",
                      background: "rgba(102, 223, 117, 0.15)",
                      color: "var(--green)",
                      border: "1px solid rgba(102, 223, 117, 0.3)",
                    }}
                  >
                    🏆 {victoriesCount} Wins
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "8px",
                      background: "rgba(255, 125, 125, 0.15)",
                      color: "var(--coral)",
                      border: "1px solid rgba(255, 125, 125, 0.3)",
                    }}
                  >
                    ⚔️ {defeatsCount} Losses
                  </span>
                </div>
              )}
            </div>
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
              <h3 style={{ margin: "0 0 8px" }}>No Matches Recorded For Your Account</h3>
              <p style={{ color: "var(--muted)", maxWidth: "420px", margin: "0 auto 20px", fontSize: "0.88rem" }}>
                Create or join a room with friends or bots to record your personal match history and victory stats.
              </p>
              <Link href="/lobby" className="button button--primary">
                Play a Match →
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {pastGames.map((match) => {
                const isCompleted = match.status === "completed";
                const isAbandoned = match.status === "abandoned";
                const isVictory = match.isVictory;

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
                      border: isCompleted && isVictory ? "1px solid rgba(102, 223, 117, 0.35)" : "1px solid var(--outline-variant)",
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
                          background: isCompleted
                            ? (isVictory ? "rgba(102, 223, 117, 0.2)" : "rgba(255, 125, 125, 0.15)")
                            : (isAbandoned ? "rgba(156, 163, 175, 0.15)" : "rgba(168, 200, 255, 0.15)"),
                          color: isCompleted
                            ? (isVictory ? "var(--green)" : "var(--coral)")
                            : (isAbandoned ? "var(--subtle)" : "var(--primary)"),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                          {isCompleted ? (isVictory ? "emoji_events" : "military_tech") : (isAbandoned ? "cancel" : "pending")}
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
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: isCompleted
                                ? (isVictory ? "rgba(102, 223, 117, 0.2)" : "rgba(255, 125, 125, 0.2)")
                                : (isAbandoned ? "rgba(156, 163, 175, 0.2)" : "rgba(255, 183, 125, 0.2)"),
                              color: isCompleted
                                ? (isVictory ? "var(--green)" : "var(--coral)")
                                : (isAbandoned ? "var(--subtle)" : "var(--tertiary)"),
                              fontWeight: 700,
                              letterSpacing: "0.03em",
                            }}
                          >
                            {isCompleted
                              ? (isVictory ? "VICTORY" : "DEFEAT")
                              : (isAbandoned ? "ABANDONED" : "IN PROGRESS")}
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
