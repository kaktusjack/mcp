// Maps MCP transport session IDs → Django session IDs
const mcpToDjangoSession = new Map<string, string>();

export function linkMcpSessionToDjango(mcpSessionId: string, djangoSessionId: string) {
  mcpToDjangoSession.set(mcpSessionId, djangoSessionId);
}

export function getDjangoSessionForMcp(mcpSessionId: string): string | undefined {
  return mcpToDjangoSession.get(mcpSessionId);
}