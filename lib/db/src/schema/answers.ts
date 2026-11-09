import { pgTable, serial, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const answersTable = pgTable(
  "answers",
  {
    id: serial("id").primaryKey(),
    habitId: integer("habit_id").notNull(),
    sessionId: text("session_id").notNull(),
    answer: text("answer").notNull(),
    userId: integer("user_id"),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("answers_habit_id_idx").on(t.habitId),
    index("answers_session_id_idx").on(t.sessionId),
    index("answers_user_id_idx").on(t.userId),
    // Partial unique index: prevents duplicate votes from the SAME USER on the SAME HABIT
    // Only applies when userId is NOT NULL (authenticated users)
    // Anonymous users (userId = NULL) are allowed multiple votes from the same session
    uniqueIndex("answers_habit_user_unique").on(t.habitId, t.userId).where(sql`${t.userId} IS NOT NULL`),
  ],
);

export const insertAnswerSchema = createInsertSchema(answersTable).omit({ id: true, answeredAt: true });
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
export type Answer = typeof answersTable.$inferSelect;
