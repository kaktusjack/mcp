// // src/tools/answers.ts
// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// import { getAnswerSchema } from "../../schema/pte/answer.js";
// import { djangoClient } from "../../clients/djangoClient.js";

// export function registerAnswerTools(server: McpServer) {
//   server.tool(
//     "get_answer",
//     "Get a test answer by answer id, or all answers for a test session by testid. Requires the caller's auth token — respects the same role-based visibility as the backend (business/admin/user).",
//     getAnswerSchema.shape,
//     async ({ id, testid }, extra) => {
//   const mcpSessionId = extra.authInfo?.clientId ?? extra.sessionId;

//   if (!mcpSessionId) {
//     return {
//       content: [{ type: "text", text: "Not authenticated — please reconnect the connector." }],
//       isError: true,
//     };
//   }

//   const params = new URLSearchParams();
//   if (id) params.set("id", id);
//   if (testid) params.set("testid", testid);

//   const res = await djangoClient.get(`/ptemock/answer/?${params.toString()}`, {
//     mcpSessionId, // TS now knows this is `string`, not `string | undefined`
//   });

//   if (res.status === 404) {
//     return { content: [{ type: "text", text: "Test answer not found." }], isError: true };
//   }
//   if (res.status === 403) {
//     return { content: [{ type: "text", text: "Unauthorized." }], isError: true };
//   }

//   return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
// }
//   );
// }
// src/tools/answers.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAnswerSchema } from "../../schema/pte/answer.js";
import { djangoClient } from "../../clients/djangoClient.js";
import { createSessionFromCredentials } from "../../auth/oauth.js"; // adjust path to match your real oauth.ts location

// TEMPORARY — for local Claude Desktop testing only, remove once real OAuth is wired
let cachedTestSessionId: string | null = null;
async function getTestSessionId(): Promise<string> {
  if (!cachedTestSessionId) {
    cachedTestSessionId = await createSessionFromCredentials(
      process.env.TEST_USER_EMAIL!,
      process.env.TEST_USER_PASSWORD!
    );
  }
  return cachedTestSessionId;
}

export function registerAnswerTools(server: McpServer) {
  server.tool(
    "get_answer",
    "Get a test answer by answer id, or all answers for a test session by testid.",
    getAnswerSchema.shape,
    async ({ id, testid }, extra) => {
        const mcpSessionId = (extra as any).djangoSessionId; // set by httpServer.ts per-connection

        if (!mcpSessionId) {
            return {
            content: [{ type: "text", text: "Not authenticated — please reconnect the connector." }],
            isError: true,
            };
        }

      const params = new URLSearchParams();
      if (id) params.set("id", id);
      if (testid) params.set("testid", testid);

      const res = await djangoClient.get(`/ptemock/answer/?${params.toString()}`, { mcpSessionId });

      if (res.status === 404) return { content: [{ type: "text", text: "Test answer not found." }], isError: true };
      if (res.status === 403) return { content: [{ type: "text", text: "Unauthorized." }], isError: true };

      return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
    }
  );
}