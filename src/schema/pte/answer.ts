// src/schemas/answer.ts
import { z } from "zod";

export const getAnswerSchema = z
  .object({
    id: z.string().optional(),
    testid: z.string().optional(),
  })
  .refine((data) => data.id || data.testid, {
    message: "Either id or testid is required.",
  });