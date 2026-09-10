import { randomUUID } from "crypto";

const BASE_URL = process.env.DJANGO_API_BASE_URL;

type Session = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};
const sessions = new Map<string, Session>();

export async function createSessionFromCredentials(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/user/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Invalid Django credentials");
  }

  const { access, refresh } = await res.json();
  const sessionId = randomUUID();

  sessions.set(sessionId, {
    accessToken: access,
    refreshToken: refresh,
    expiresAt: Date.now() + 4 * 60 * 1000, // adjust to match your ACCESS_TOKEN_LIFETIME setting
  });

  return sessionId;
}

async function refreshSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Unknown session");

  const res = await fetch(`${BASE_URL}/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: session.refreshToken }),
  });

  if (!res.ok) throw new Error("Refresh failed — user must re-authenticate");

  // rotation: BOTH tokens change on every refresh
  const { access, refresh } = await res.json();
  session.accessToken = access;
  session.refreshToken = refresh;
  session.expiresAt = Date.now() + 4 * 60 * 1000;
  sessions.set(sessionId, session);
}

export async function getValidDjangoToken(sessionId: string): Promise<string> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Not authenticated — please reconnect the connector.");

  if (Date.now() >= session.expiresAt) {
    await refreshSession(sessionId);
  }

  return sessions.get(sessionId)!.accessToken;
}
// add to src/auth/oauth.ts
export function storeSessionFromTokens(access: string, refresh: string): string {
  const sessionId = randomUUID();
  sessions.set(sessionId, {
    accessToken: access,
    refreshToken: refresh,
    expiresAt: Date.now() + 4 * 60 * 1000,
  });
  return sessionId;
}