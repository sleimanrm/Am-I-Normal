import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { habitsTable } from "./habits";
import { usersTable } from "./users";

export const reportsTable = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    habitId: integer("habit_id")
      .notNull()
      .references(() => habitsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .references(() => usersTable.id, { onDelete: "set null" }),
    sessionId: text("session_id").notNull(),
    reason: text("reason").notNull(),
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("reports_habit_session_uniq").on(t.habitId, t.sessionId)],
);

export type Report = typeof reportsTable.$inferSelect;
