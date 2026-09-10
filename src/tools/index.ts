import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAnswerTools } from "./pte/answer.js";

export function registerAllTools(server: McpServer) {
  registerAnswerTools(server);
}