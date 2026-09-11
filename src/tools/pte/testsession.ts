// src/tools/testSessions.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listTestSessionsSchema } from "../../schema/pte/testsession.js"; // adjust path to match your real location
import { djangoClient } from "../../clients/djangoClient.js";
import { getDjangoSessionForMcp } from "../../auth/sessionMap.js";

export function registerTestSessionTools(server: McpServer) {
  server.tool(
    "list_test_sessions",
    "List the authenticated user's test sessions (PTE, IELTS, CAS, etc). Returns test type, date, and status for each. Pass an id to get a single specific session instead of the full list. Use this first to find a session's id before calling get_answer.",
    listTestSessionsSchema.shape,
    async ({ id }, extra) => {
      const mcpSessionId = getDjangoSessionForMcp(extra.sessionId ?? "");

      if (!mcpSessionId) {
        return {
          content: [{ type: "text", text: "Not authenticated — please reconnect the connector." }],
          isError: true,
        };
      }

      const params = new URLSearchParams();
      if (id) params.set("id", id);

      const res = await djangoClient.get(`/testsession/?${params.toString()}`, {
        mcpSessionId,
      });

      if (res.status === 404) {
        return { content: [{ type: "text", text: "Test session not found." }], isError: true };
      }
      if (res.status === 403) {
        return { content: [{ type: "text", text: "Unauthorized." }], isError: true };
      }

      return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
    }
  );
}