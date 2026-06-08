import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const answersTable = pgTable(
  "answers",
  {
    id: serial("id").primaryKey(),
    habitId: integer("habit_id").notNull(),
    sessionId: text("session_id").notNull(),
    answer: text("answer").notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("answers_habit_id_idx").on(t.habitId),
    index("answers_session_id_idx").on(t.sessionId),
  ],
);

export const insertAnswerSchema = createInsertSchema(answersTable).omit({ id: true, answeredAt: true });
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
export type Answer = typeof answersTable.$inferSelect;
