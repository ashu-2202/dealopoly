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

export function saveRoomSession(roomCode: string, playerId: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    const sessions = getRoomSessions();
    sessions[roomCode] = { playerId, token, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch {
    // Ignore quota error
  }
}

export function getRoomSession(roomCode: string): { playerId: string; token: string } | null {
  const sessions = getRoomSessions();
  return sessions[roomCode] || null;
}

function getRoomSessions(): Record<string, { playerId: string; token: string; timestamp: number }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
