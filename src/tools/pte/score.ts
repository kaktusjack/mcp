import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getScoreSchema } from "../../schema/pte/score.js";
import { djangoClient } from "../../clients/djangoClient.js";
import { getDjangoSessionForMcp } from "../../auth/sessionMap.js";

export function registerScoreTools(server: McpServer) {
  server.tool(
    "get_score",
    "Get the computed score for a test session. Uses the same testid as get_answer and list_test_sessions. If scoring is still in progress, returns a status message instead.",
    getScoreSchema.shape,
    async ({ testid }, extra) => {
      const mcpSessionId = getDjangoSessionForMcp(extra.sessionId ?? "");

      if (!mcpSessionId) {
        return {
          content: [{ type: "text", text: "Not authenticated — please reconnect the connector." }],
          isError: true,
        };
      }

      const res = await djangoClient.get(`/score/?id=${testid}`, { mcpSessionId }); // Django still expects `id` as the query param name

      if (res.status === 404) {
        return { content: [{ type: "text", text: "Test session not found." }], isError: true };
      }
      if (res.status === 202) {
        return { content: [{ type: "text", text: res.data.message ?? "Scoring in progress." }] };
      }
      if (res.status === 403) {
        return { content: [{ type: "text", text: "Unauthorized." }], isError: true };
      }

      return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
    }
  );
}