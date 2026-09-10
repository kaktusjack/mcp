// src/test-auth.ts — delete once things work
import "dotenv/config";
import { createSessionFromCredentials, getValidDjangoToken } from "./auth/oauth.js";

const sessionId = await createSessionFromCredentials(
  process.env.TEST_USER_EMAIL!,
  process.env.TEST_USER_PASSWORD!
);
console.log("✅ Session created:", sessionId);

const token = await getValidDjangoToken(sessionId);
console.log("✅ Access token:", token);

const res = await fetch(`${process.env.DJANGO_API_BASE_URL}/ptemock/answer/?testid=1101`, {
  headers: { Authorization: `Bearer ${token}` },
});
console.log("Status:", res.status);
console.log("Data:", await res.json());