// src/schema/pte/testSession.ts
import { z } from "zod";

export const listTestSessionsSchema = z.object({
  id: z.string().optional(), // omit to get all of the user's sessions, provide to get one specific session
});