// src/clients/djangoClient.ts
import { getValidDjangoToken } from "../auth/oauth.js";

const BASE_URL = process.env.DJANGO_API_BASE_URL;

export const djangoClient = {
  async get(path: string, opts: { mcpSessionId: string }) {
    const token = await getValidDjangoToken(opts.mcpSessionId);
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return { status: res.status, data: await res.json() };
  },
};