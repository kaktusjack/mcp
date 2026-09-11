import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getQuestionsSchema } from "../../schema/pte/question.js";
import { djangoClient } from "../../clients/djangoClient.js";
import { getDjangoSessionForMcp } from "../../auth/sessionMap.js";

export function registerQuestionTools(server: McpServer) {
  server.tool(
    "get_questions",
    "Browse or fetch practice questions. Pass id to get one specific question. Otherwise, filter by category, type, level, and whether the user has already attempted it (attempted: true/false). Supports pagination via page.",
    getQuestionsSchema.shape,
    async ({ id, category, type, level, attempted, page }, extra) => {
      const mcpSessionId = getDjangoSessionForMcp(extra.sessionId ?? "");

      if (!mcpSessionId) {
        return {
          content: [{ type: "text", text: "Not authenticated — please reconnect the connector." }],
          isError: true,
        };
      }

      const params = new URLSearchParams();
      if (id) params.set("id", id);
      if (category) params.set("category", category);
      if (type) params.set("type", type);
      if (level) params.set("level", level);
      if (attempted) params.set("attempted", attempted);
      if (page) params.set("page", page);

      const res = await djangoClient.get(`/question/?${params.toString()}`, { mcpSessionId });

      if (res.status === 404) {
        return { content: [{ type: "text", text: "Question not found." }], isError: true };
      }

      return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
    }
  );
}