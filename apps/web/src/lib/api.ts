const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export interface CreateRoomResponse {
  roomCode: string;
  hostPlayerId: string;
  sessionToken: string;
  room: {
    code: string;
    hostPlayerId: string;
    status: string;
    maxSeats: number;
    seats: Array<{
      seatIndex: number;
      playerId: string;
      name: string;
      isBot: boolean;
      isConnected: boolean;
    }>;
  };
}

export interface JoinRoomResponse {
  roomCode: string;
  playerId: string;
  sessionToken: string;
  room: {
    code: string;
    hostPlayerId: string;
    status: string;
    maxSeats: number;
    seats: Array<{
      seatIndex: number;
      playerId: string;
      name: string;
      isBot: boolean;
      isConnected: boolean;
    }>;
  };
}

export async function createRoomApi(params: {
  hostName?: string;
  botCount?: number;
}): Promise<CreateRoomResponse> {
  const res = await fetch(`${API_BASE}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create room (${res.status})`);
  }

  return res.json();
}

export async function joinRoomApi(params: {
  roomCode: string;
  playerName?: string;
}): Promise<JoinRoomResponse> {
  const res = await fetch(`${API_BASE}/api/rooms/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to join room (${res.status})`);
  }

  return res.json();
}

export async function fetchRoomApi(roomCode: string) {
  const res = await fetch(`${API_BASE}/api/rooms/${roomCode}`);
  if (!res.ok) {
    throw new Error(`Room ${roomCode} not found`);
  }
  return res.json();
}
