import { randomUUID } from "crypto";

type AuthCode = {
  djangoSessionId: string;
  redirectUri: string;
  expiresAt: number;
};

type AccessToken = {
  djangoSessionId: string;
  expiresAt: number;
};

const authCodes = new Map<string, AuthCode>();
const accessTokens = new Map<string, AccessToken>();

export function createAuthCode(djangoSessionId: string, redirectUri: string): string {
  const code = randomUUID();
  authCodes.set(code, {
    djangoSessionId,
    redirectUri,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min, standard for auth codes
  });
  return code;
}

export function consumeAuthCode(code: string): AuthCode | null {
  const entry = authCodes.get(code);
  if (!entry || Date.now() > entry.expiresAt) return null;
  authCodes.delete(code); // one-time use
  return entry;
}

export function createAccessToken(djangoSessionId: string): string {
  const token = randomUUID();
  accessTokens.set(token, {
    djangoSessionId,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h — your MCP token, not the Django JWT itself
  });
  return token;
}

export function resolveAccessToken(token: string): string | null {
  const entry = accessTokens.get(token);
  if (!entry || Date.now() > entry.expiresAt) return null;
  console.log(`Resolved access token: ${token} to Django session: ${entry.djangoSessionId}`);
  return entry.djangoSessionId;
}