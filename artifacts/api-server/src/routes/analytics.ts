import { Router, type IRouter } from "express";
import { db, usersTable, habitsTable, answersTable, reportsTable } from "@workspace/db";
import { eq, sql, count, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/admin/analytics", requireAdmin, async (_req, res): Promise<void> => {
  const [
    totalUsersResult,
    dailyActiveResult,
    totalHabitsResult,
    habitsTodayResult,
    votesTodayResult,
    reportsTodayResult,
    topCategoriesResult,
    mostVotedResult,
  ] = await Promise.all([
    // Total registered users
    db.select({ count: count() }).from(usersTable),

    // Daily active sessions (distinct sessionIds with a vote in last 24 h)
    db
      .select({ count: sql<string>`COUNT(DISTINCT ${answersTable.sessionId})` })
      .from(answersTable)
      .where(sql`${answersTable.answeredAt} > NOW() - INTERVAL '1 day'`),

    // Total active habits
    db.select({ count: count() }).from(habitsTable).where(eq(habitsTable.status, "active")),

    // Habits created today
    db
      .select({ count: count() })
      .from(habitsTable)
      .where(sql`${habitsTable.createdAt} > NOW() - INTERVAL '1 day'`),

    // Votes cast today
    db
      .select({ count: count() })
      .from(answersTable)
      .where(sql`${answersTable.answeredAt} > NOW() - INTERVAL '1 day'`),

    // Reports filed today
    db
      .select({ count: count() })
      .from(reportsTable)
      .where(sql`${reportsTable.reportedAt} > NOW() - INTERVAL '1 day'`),

    // Top 5 categories by active habit count
    db
      .select({ category: habitsTable.category, count: count() })
      .from(habitsTable)
      .where(eq(habitsTable.status, "active"))
      .groupBy(habitsTable.category)
      .orderBy(desc(count()))
      .limit(5),

    // Top 5 most-voted habits (by answer count)
    db
      .select({
        id: habitsTable.id,
        question: habitsTable.question,
        answerCount: count(answersTable.id),
        meTooPct: sql<string>`
          CASE
            WHEN COUNT(${answersTable.id}) = 0 THEN ${habitsTable.meTooPctDefault}::numeric
            ELSE ROUND(SUM(CASE WHEN ${answersTable.answer} = 'me_too' THEN 100.0 ELSE 0 END) / COUNT(${answersTable.id}))
          END
        `,
      })
      .from(habitsTable)
      .leftJoin(answersTable, eq(answersTable.habitId, habitsTable.id))
      .where(eq(habitsTable.status, "active"))
      .groupBy(habitsTable.id)
      .orderBy(desc(count(answersTable.id)))
      .limit(5),
  ]);

  res.json({
    totalUsers: Number(totalUsersResult[0].count),
    dailyActiveUsers: Number(dailyActiveResult[0].count),
    totalHabits: Number(totalHabitsResult[0].count),
    habitsToday: Number(habitsTodayResult[0].count),
    votesToday: Number(votesTodayResult[0].count),
    reportsToday: Number(reportsTodayResult[0].count),
    topCategories: topCategoriesResult.map((r) => ({ category: r.category, count: Number(r.count) })),
    mostVotedHabits: mostVotedResult.map((r) => ({
      id: r.id,
      question: r.question,
      answerCount: Number(r.answerCount),
      meTooPct: Number(r.meTooPct),
    })),
  });
});

export default router;
