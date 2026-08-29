import { NextResponse } from "next/server";
import { db, users, players, games, sql, count } from "@dealopoly/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let totalRegisteredUsers = 0;
  let totalUniquePlayers = 0;
  let totalGamesPlayed = 0;
  let onlinePlayers = 0;
  let activeRooms = 0;
  let serversOnline = false;

  const API_BASE =
    process.env.GAME_SERVER_URL ||
    process.env.NEXT_PUBLIC_GAME_SERVER_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://localhost:4000";

  // 1. Check live game server stats
  try {
    const serverRes = await fetch(`${API_BASE}/api/stats`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (serverRes.ok) {
      const data = await serverRes.json();
      serversOnline = true;
      onlinePlayers = data.onlinePlayers ?? 0;
      activeRooms = data.activeRooms ?? 0;
    }
  } catch {
    // If local fetch fails or server is spinning up, try /health
    try {
      const healthRes = await fetch(`${API_BASE}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(1500),
      });
      if (healthRes.ok) {
        serversOnline = true;
      }
    } catch {
      // Offline or unreachable
    }
  }

  // 2. Query Postgres for database totals
  try {
    if (process.env.DATABASE_URL) {
      const [usersCountRes] = await db.select({ count: count() }).from(users);
      const [playersCountRes] = await db
        .select({ count: count() })
        .from(players)
        .where(sql`${players.isBot} = false`);
      const [gamesCountRes] = await db.select({ count: count() }).from(games);

      totalRegisteredUsers = usersCountRes?.count ?? 0;
      totalUniquePlayers = playersCountRes?.count ?? 0;
      totalGamesPlayed = gamesCountRes?.count ?? 0;
    }
  } catch (err) {
    console.error("Failed to query db stats:", err);
  }

  return NextResponse.json({
    serversOnline,
    onlinePlayers,
    activeRooms,
    totalPlayers: Math.max(totalUniquePlayers, totalRegisteredUsers),
    totalGames: totalGamesPlayed,
    timestamp: Date.now(),
  });
}
