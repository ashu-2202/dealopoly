export interface PlayerProfile {
  id: string;
  name: string;
}

const STORAGE_KEY_PROFILE = "dealopoly_player_profile";
const STORAGE_KEY_SESSIONS = "dealopoly_room_sessions";

export function getStoredProfile(): PlayerProfile {
  if (typeof window === "undefined") {
    return { id: "p-guest", name: "Guest Player" };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore JSON error
  }

  const newProfile: PlayerProfile = {
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "Player " + Math.floor(100 + Math.random() * 900),
  };

  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(newProfile));
  } catch {
    // Ignore quota error
  }

  return newProfile;
}

export function saveProfileName(name: string): PlayerProfile {
  const profile = getStoredProfile();
  const updated = { ...profile, name: name.trim() || profile.name };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(updated));
    } catch {
      // Ignore quota error
    }
  }
  return updated;
}

type RoomSession = { playerId: string; token: string; timestamp: number };

export function saveRoomSession(roomCode: string, playerId: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    const sessions = getRoomSessions();
    if (!sessions[roomCode]) {
      sessions[roomCode] = [];
    } else if (!Array.isArray(sessions[roomCode])) {
      // Migrate old format
      sessions[roomCode] = [sessions[roomCode] as unknown as RoomSession];
    }

    const roomSessions = sessions[roomCode] as RoomSession[];
    const existingIndex = roomSessions.findIndex((s) => s.playerId === playerId);
    if (existingIndex >= 0) {
      roomSessions[existingIndex] = { playerId, token, timestamp: Date.now() };
    } else {
      roomSessions.push({ playerId, token, timestamp: Date.now() });
    }
    
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch {
    // Ignore quota error
  }
}

export function getRoomSession(roomCode: string, preferredPlayerId?: string): { playerId: string; token: string } | null {
  const sessions = getRoomSessions();
  const roomSessions = sessions[roomCode];
  if (!roomSessions) return null;

  if (Array.isArray(roomSessions)) {
    if (roomSessions.length === 0) return null;
    
    if (preferredPlayerId) {
      const match = roomSessions.find((s) => s.playerId === preferredPlayerId);
      if (match) return match;
    }
    
    // Sort by most recently used
    const sorted = [...roomSessions].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0] || null;
  } else {
    // Old format migration fallback
    const oldSession = roomSessions as unknown as RoomSession;
    if (preferredPlayerId && oldSession.playerId !== preferredPlayerId) return null;
    return oldSession;
  }
}

function getRoomSessions(): Record<string, RoomSession[] | RoomSession> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
