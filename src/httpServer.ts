import "dotenv/config";
import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAllTools } from "./tools/index.js";
import { oauthRouter } from "./routes/oauthRoutes.js";
import { resolveAccessToken } from "./auth/tokenStore.js";

const app = express();
app.set("trust proxy", true);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // needed for the login form POST

// --- OAuth endpoints (/.well-known, /authorize, /token, /authorize/google*) ---
app.use(oauthRouter);

// --- Track one MCP transport per active session, keyed by mcp-session-id header ---
const transports = new Map<string, StreamableHTTPServerTransport>();

app.post("/mcp", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.toString().replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ error: "unauthorized", error_description: "Missing bearer token" });
    return;
  }

  const djangoSessionId = resolveAccessToken(token);
  if (!djangoSessionId) {
    res.status(401).json({ error: "invalid_token" });
    return;
  }

  const existingSessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport = existingSessionId ? transports.get(existingSessionId) : undefined;

  if (!transport) {
    const server = new McpServer({ name: "exam-systems", version: "1.0.0" });
    registerAllTools(server);

    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports.set(sid, transport!);
      },
    });

    // Attach the resolved Django session so tools can read it via `extra`
    (transport as any).djangoSessionId = djangoSessionId;

    await server.connect(transport);
  }

  await transport.handleRequest(req, res, req.body);
});

// --- Required MCP spec endpoint: tells clients where auth lives ---
app.get("/.well-known/oauth-protected-resource", (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  res.json({
    resource: `${base}/mcp`,
    authorization_servers: [base],
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MCP HTTP server running on port ${PORT}`);
});