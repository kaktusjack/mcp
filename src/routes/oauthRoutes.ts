// src/routes/oauthRoutes.ts
import { Router } from "express";
import { randomUUID } from "crypto";
import { createSessionFromCredentials, storeSessionFromTokens } from "../auth/oauth.js";
import { createAuthCode, consumeAuthCode, createAccessToken } from "../auth/tokenStore.js";

export const oauthRouter = Router();

// Step 1: tells clients where the endpoints live (required by MCP spec)
oauthRouter.get("/.well-known/oauth-authorization-server", (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  console.log("OAuth discovery endpoint hit, returning:", {
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
  });
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    registration_endpoint: `${base}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
  });
});

// In-memory store — swap for DB/Redis later, same caveat as sessions/tokens
const registeredClients = new Map<string, { redirect_uris: string[] }>();

oauthRouter.post("/register", (req, res) => {
  const { redirect_uris, client_name } = req.body;

  if (!redirect_uris || !Array.isArray(redirect_uris)) {
    return res.status(400).json({ error: "invalid_client_metadata" });
  }

  const client_id = randomUUID();
  registeredClients.set(client_id, { redirect_uris });
  console.log(`Registered new client: ${client_id} with redirect URIs:`, redirect_uris);

  res.status(201).json({
    client_id,
    client_name: client_name ?? "MCP Client",
    redirect_uris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  });
});

// Step 2: show login form
oauthRouter.get("/authorize", (req, res) => {
  const { redirect_uri, state, client_id } = req.query;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Sign in — Exam Systems</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #0f172a;
          color: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .card {
          background: #1e293b;
          padding: 32px;
          border-radius: 12px;
          width: 320px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        h2 { margin: 0 0 4px; font-size: 20px; }
        p.sub { margin: 0 0 24px; color: #94a3b8; font-size: 14px; }
        input {
          width: 100%;
          padding: 10px 12px;
          margin-bottom: 12px;
          border-radius: 6px;
          border: 1px solid #334155;
          background: #0f172a;
          color: #e2e8f0;
          box-sizing: border-box;
          font-size: 14px;
        }
        button {
          width: 100%;
          padding: 10px;
          border: none;
          border-radius: 6px;
          background: #3b82f6;
          color: white;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          margin-top: 4px;
        }
        button:hover { background: #2563eb; }
        .divider {
          display: flex;
          align-items: center;
          margin: 20px 0;
          color: #64748b;
          font-size: 12px;
        }
        .divider::before, .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #334155;
        }
        .divider span { padding: 0 10px; }
        .google-btn {
          display: block;
          text-align: center;
          padding: 10px;
          border-radius: 6px;
          border: 1px solid #334155;
          color: #e2e8f0;
          text-decoration: none;
          font-size: 14px;
        }
        .google-btn:hover { background: #334155; }
        .error { color: #f87171; font-size: 13px; margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Sign in</h2>
        <p class="sub">Connect your Exam Systems account</p>

        ${req.query.error ? `<div class="error">${req.query.error}</div>` : ""}

        <form method="POST" action="/authorize">
          <input type="hidden" name="redirect_uri" value="${redirect_uri ?? ""}" />
          <input type="hidden" name="state" value="${state ?? ""}" />
          <input type="hidden" name="client_id" value="${client_id ?? ""}" />
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Sign in</button>
        </form>

        <div class="divider"><span>OR</span></div>

        
          class="google-btn"
          href="/authorize/google?redirect_uri=${encodeURIComponent(String(redirect_uri ?? ""))}&state=${encodeURIComponent(String(state ?? ""))}"
        >
          Sign in with Google
        </a>
      </div>
    </body>
    </html>
  `);
});

// Step 3: handle login submission, redirect back with code
oauthRouter.post("/authorize", async (req, res) => {
  const { email, password, redirect_uri, state, client_id } = req.body;
  try {
    const djangoSessionId = await createSessionFromCredentials(email, password);
    const code = createAuthCode(djangoSessionId, redirect_uri);
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("code", code);
    if (state) redirectUrl.searchParams.set("state", state);
    console.log(`User ${email} authenticated, redirecting to:`, redirectUrl.toString());
    res.redirect(redirectUrl.toString());
  } catch (err) {
    const retryUrl = new URL(`${req.protocol}://${req.get("host")}/authorize`);
    retryUrl.searchParams.set("redirect_uri", redirect_uri);
    retryUrl.searchParams.set("state", state);
    retryUrl.searchParams.set("client_id", client_id);
    retryUrl.searchParams.set("error", "Invalid email or password");
    res.redirect(retryUrl.toString());
  }
});

// Step 4: exchange code for an MCP access token
oauthRouter.post("/token", (req, res) => {
  const { code, grant_type } = req.body;
  if (grant_type !== "authorization_code") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }
  const entry = consumeAuthCode(code);
  if (!entry) {
    return res.status(400).json({ error: "invalid_grant" });
  }
  const accessToken = createAccessToken(entry.djangoSessionId);
  console.log(`Exchanged code for access token: ${accessToken} (session: ${entry.djangoSessionId})`);
  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 86400,
  });
});

// Step A: browser hits this from the "Sign in with Google" link
oauthRouter.get("/authorize/google", async (req, res) => {
  const { redirect_uri, state } = req.query;
  const mcpCallback = `${req.protocol}://${req.get("host")}/authorize/google/callback?mcp_state=${state}&mcp_redirect_uri=${encodeURIComponent(redirect_uri as string)}`;

  const initiateRes = await fetch(
    `${process.env.DJANGO_API_BASE_URL}/google-auth/initiate/?next=${encodeURIComponent(mcpCallback)}`
  );
  const { authorization_url } = await initiateRes.json();
  res.redirect(authorization_url);
});

// Step B: Django redirects back here after Google login succeeds
oauthRouter.get("/authorize/google/callback", (req, res) => {
  const { access, refresh, mcp_state, mcp_redirect_uri } = req.query;

  const sessionId = storeSessionFromTokens(access as string, refresh as string);

  const code = createAuthCode(sessionId, mcp_redirect_uri as string);
  const redirectUrl = new URL(mcp_redirect_uri as string);
  redirectUrl.searchParams.set("code", code);
  if (mcp_state) redirectUrl.searchParams.set("state", mcp_state as string);
  res.redirect(redirectUrl.toString());
});