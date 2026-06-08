import { pgTable, serial, text, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const traitScoresTable = pgTable(
  "trait_scores",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    scores: jsonb("scores").$type<Record<string, number>>().notNull().default({}),
    maxScores: jsonb("max_scores").$type<Record<string, number>>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("trait_scores_session_id_idx").on(t.sessionId)],
);

export const insertTraitScoreSchema = createInsertSchema(traitScoresTable).omit({ id: true, updatedAt: true });
export type InsertTraitScore = z.infer<typeof insertTraitScoreSchema>;
export type TraitScore = typeof traitScoresTable.$inferSelect;
