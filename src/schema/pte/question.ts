import { z } from "zod";

export const getQuestionsSchema = z.object({
  id: z.string().optional(),          // fetch one specific question by id
  category: z.string().optional(),
  type: z.string().optional(),        // question_type
  level: z.string().optional(),       // question_difficulty
  attempted: z.enum(["true", "false"]).optional(),
  page: z.string().optional(),        // DRF pagination
});