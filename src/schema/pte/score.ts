import { z } from "zod";

export const getScoreSchema = z.object({
  testid: z.string(), // same TestSession.id used in get_answer
});