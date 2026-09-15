import { z } from "zod";

const QuestionCategory = z.enum(["listening", "reading", "speaking", "writing"]);

const QuestionType = z.enum([
  // Speaking
  "read_aloud", "repeat_sentence", "describe_image", "retell_lecture",
  "answer_short_question", "respond_situation", "summarize_discussion",
  // Writing
  "summarize_written_text", "essay",
  // Reading
  "rw_fill_blanks", "multi_answer_reading", "reorder_paragraph",
  "fill_blanks_reading", "single_answer_reading",
  // Listening
  "summarize_spoken_text", "multi_answer_listening", "fill_blanks_listening",
  "highlight_correct_summary", "single_answer_listening", "select_missing_word",
  "highlight_incorrect_word", "write_from_dictation",
]);

export const getQuestionsSchema = z.object({
  id: z.string().optional(),
  category: QuestionCategory.optional().describe(
    "Filter by category: listening, reading, speaking, writing"
  ),
  type: QuestionType.optional().describe(
    "Filter by specific question type, e.g. read_aloud, describe_image, essay, etc."
  ),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(), // match your actual level choices
  attempted: z.enum(["true", "false"]).optional(),
  page: z.string().optional(),
});