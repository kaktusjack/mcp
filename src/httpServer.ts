import "dotenv/config";
import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAllTools } from "./tools/index.js";
import { oauthRouter } from "./routes/oauthRoutes.js";
import { resolveAccessToken } from "./auth/tokenStore.js";
import { linkMcpSessionToDjango } from "./auth/sessionMap.js"; // ADD THIS IMPORT

const app = express();
app.set("trust proxy", true);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(oauthRouter);

const transports = new Map<string, StreamableHTTPServerTransport>();

app.post("/mcp", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.toString().replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ error: "unauthorized", error_description: "Missing bearer token" });
    return;
  }

  const djangoSessionId = resolveAccessToken(token);
  console.log(`Incoming MCP request with token: ${token}, resolved Django session: ${djangoSessionId}`);
  if (!djangoSessionId) {
    res.status(401).json({ error: "invalid_token" });
    return;
  }

  const existingSessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport = existingSessionId ? transports.get(existingSessionId) : undefined;
  console.log(`Existing MCP session ID: ${existingSessionId}, transport found: ${!!transport}`);

  if (!transport) {
    const server = new McpServer({ name: "exam-systems", version: "1.0.0" });
    registerAllTools(server);

    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports.set(sid, transport!);
        linkMcpSessionToDjango(sid, djangoSessionId); // ADD THIS LINE — was missing entirely
      },
    });

    // DELETE THIS LINE — it was never actually read anywhere:
    // (transport as any).djangoSessionId = djangoSessionId;

    await server.connect(transport);
  }

  await transport.handleRequest(req, res, req.body);
});

app.get("/.well-known/oauth-protected-resource", (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  res.json({
    resource: `${base}/mcp`,
    authorization_servers: [base],
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP HTTP server running on port ${PORT}`);
});