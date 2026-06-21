import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { habitsTable } from "./habits";
import { usersTable } from "./users";

export const moderationLogsTable = pgTable(
  "moderation_logs",
  {
    id: serial("id").primaryKey(),
    habitId: integer("habit_id").references(() => habitsTable.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    actorUserId: integer("actor_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("moderation_logs_habit_id_idx").on(t.habitId),
    index("moderation_logs_created_at_idx").on(t.createdAt),
  ],
);

export type ModerationLog = typeof moderationLogsTable.$inferSelect;
