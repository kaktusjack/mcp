import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAnswerTools } from "./pte/answer.js";
import { registerTestSessionTools } from "./pte/testsession.js";
import { registerScoreTools } from "./pte/score.js";
import { registerQuestionTools } from "./pte/question.js";

export function registerAllTools(server: McpServer) {
  registerAnswerTools(server);
  registerTestSessionTools(server); 
  registerQuestionTools(server);
  registerScoreTools(server);
}