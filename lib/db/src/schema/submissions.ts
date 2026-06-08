import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const submissionsTable = pgTable(
  "submissions",
  {
    id: serial("id").primaryKey(),
    question: text("question").notNull(),
    status: text("status").notNull().default("pending"),
    habitId: integer("habit_id"),
    submitterSessionId: text("submitter_session_id"),
    moderationReason: text("moderation_reason"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index("submissions_session_id_idx").on(t.submitterSessionId)],
);

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({ id: true, submittedAt: true, updatedAt: true });
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;
