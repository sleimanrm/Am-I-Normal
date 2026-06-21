import { Router, type IRouter } from "express";
import { db, habitsTable, answersTable, reportsTable } from "@workspace/db";
import { eq, sql, count, desc, and } from "drizzle-orm";
import { optionalAuth } from "../middlewares/auth";
import {
  GetHabitsResponse,
  GetTrendingQueryParams,
  GetTrendingResponse,
  GetCategoriesResponse,
  GetHabitsByCategoryQueryParams,
  GetHabitsByCategoryResponse,
  UpdateHabitBody,
  UpdateHabitParams,
  UpdateHabitResponse,
  ReportHabitBody,
  ReportHabitParams,
  ReportHabitResponse,
  GetFlaggedHabitsResponse,
  UpdateFlaggedHabitParams,
  UpdateFlaggedHabitBody,
  ListAdminHabitsResponse,
  DeleteHabitParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const FLAG_THRESHOLD = 1;

// ── Habit list ────────────────────────────────────────────────────────────────

router.get("/habits", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: habitsTable.id,
      question: habitsTable.question,
      category: habitsTable.category,
      meTooPct: sql<string>`
        CASE
          WHEN COUNT(${answersTable.id}) = 0 THEN ${habitsTable.meTooPctDefault}::numeric
          ELSE ROUND(SUM(CASE WHEN ${answersTable.answer} = 'me_too' THEN 100.0 ELSE 0 END) / COUNT(${answersTable.id}))
        END
      `,
      traits: habitsTable.traits,
      source: habitsTable.source,
      status: habitsTable.status,
      answerCount: count(answersTable.id),
      reportCount: habitsTable.reportCount,
      flagged: habitsTable.flagged,
    })
    .from(habitsTable)
    .leftJoin(answersTable, eq(answersTable.habitId, habitsTable.id))
    .where(eq(habitsTable.status, "active"))
    .groupBy(habitsTable.id)
    .orderBy(habitsTable.id);

  const habits = rows.map((r) => ({
    ...r,
    meTooPct: Number(r.meTooPct),
    answerCount: Number(r.answerCount),
  }));

  res.json(GetHabitsResponse.parse(habits));
});

// ── Trending habits ───────────────────────────────────────────────────────────

router.get("/habits/trending", async (req, res): Promise<void> => {
  const params = GetTrendingQueryParams.safeParse(req.query);
  const sessionId = params.success && params.data.sessionId ? params.data.sessionId : null;

  const userAnswerExpr = sessionId
    ? sql<string | null>`MAX(CASE WHEN ${answersTable.sessionId} = ${sessionId} THEN ${answersTable.answer} ELSE NULL END)`
    : sql<null>`NULL`;

  const rows = await db
    .select({
      id: habitsTable.id,
      question: habitsTable.question,
      category: habitsTable.category,
      source: habitsTable.source,
      createdAt: habitsTable.createdAt,
      meTooPct: sql<string>`
        CASE
          WHEN COUNT(${answersTable.id}) = 0 THEN ${habitsTable.meTooPctDefault}::numeric
          ELSE ROUND(SUM(CASE WHEN ${answersTable.answer} = 'me_too' THEN 100.0 ELSE 0 END) / COUNT(${answersTable.id}))
        END
      `,
      answerCount: count(answersTable.id),
      userAnswer: userAnswerExpr,
    })
    .from(habitsTable)
    .leftJoin(answersTable, eq(answersTable.habitId, habitsTable.id))
    .where(eq(habitsTable.status, "active"))
    .groupBy(habitsTable.id, habitsTable.createdAt);

  const habits = rows.map((r) => ({
    id: r.id,
    question: r.question,
    category: r.category,
    source: r.source,
    createdAt: r.createdAt,
    meTooPct: Number(r.meTooPct),
    answerCount: Number(r.answerCount),
    userAnswer: r.userAnswer ?? null,
  }));

  // Use all habits for spotlight — meTooPct already falls back to meTooPctDefault when no answers
  const mostRelatable =
    habits.length > 0
      ? habits.reduce((a, b) => (a.meTooPct >= b.meTooPct ? a : b))
      : null;

  const mostSurprising =
    habits.length > 0
      ? habits.reduce((a, b) => (a.meTooPct <= b.meTooPct ? a : b))
      : null;

  const mostDivisive =
    habits.length > 0
      ? habits.reduce((a, b) =>
          Math.abs(a.meTooPct - 50) <= Math.abs(b.meTooPct - 50) ? a : b
        )
      : null;

  const newFromCommunity = habits
    .filter((h) => h.source === "community")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8);

  const toHabit = (h: (typeof habits)[0]) => ({
    id: h.id,
    question: h.question,
    meTooPct: h.meTooPct,
    answerCount: h.answerCount,
    category: h.category,
    userAnswer: h.userAnswer,
  });

  res.json(
    GetTrendingResponse.parse({
      mostRelatable: mostRelatable ? toHabit(mostRelatable) : null,
      mostSurprising: mostSurprising ? toHabit(mostSurprising) : null,
      mostDivisive: mostDivisive ? toHabit(mostDivisive) : null,
      newFromCommunity: newFromCommunity.map(toHabit),
    })
  );
});

// ── Categories list ───────────────────────────────────────────────────────────

router.get("/habits/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      category: habitsTable.category,
      count: count(habitsTable.id),
    })
    .from(habitsTable)
    .where(eq(habitsTable.status, "active"))
    .groupBy(habitsTable.category)
    .orderBy(habitsTable.category);

  res.json(GetCategoriesResponse.parse(rows.map((r) => ({ ...r, count: Number(r.count) }))));
});

// ── Habits by category ────────────────────────────────────────────────────────

router.get("/habits/by-category", async (req, res): Promise<void> => {
  const params = GetHabitsByCategoryQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { category, sessionId = null } = params.data;

  const userAnswerExpr = sessionId
    ? sql<string | null>`MAX(CASE WHEN ${answersTable.sessionId} = ${sessionId} THEN ${answersTable.answer} ELSE NULL END)`
    : sql<null>`NULL`;

  const rows = await db
    .select({
      id: habitsTable.id,
      question: habitsTable.question,
      category: habitsTable.category,
      source: habitsTable.source,
      createdAt: habitsTable.createdAt,
      meTooPct: sql<string>`
        CASE
          WHEN COUNT(${answersTable.id}) = 0 THEN ${habitsTable.meTooPctDefault}::numeric
          ELSE ROUND(SUM(CASE WHEN ${answersTable.answer} = 'me_too' THEN 100.0 ELSE 0 END) / COUNT(${answersTable.id}))
        END
      `,
      answerCount: count(answersTable.id),
      userAnswer: userAnswerExpr,
    })
    .from(habitsTable)
    .leftJoin(answersTable, eq(answersTable.habitId, habitsTable.id))
    .where(and(eq(habitsTable.status, "active"), eq(habitsTable.category, category)))
    .groupBy(habitsTable.id, habitsTable.createdAt)
    .orderBy(habitsTable.id);

  const habits = rows.map((r) => ({
    id: r.id,
    question: r.question,
    category: r.category,
    meTooPct: Number(r.meTooPct),
    answerCount: Number(r.answerCount),
    userAnswer: r.userAnswer ?? null,
  }));

  res.json(GetHabitsByCategoryResponse.parse(habits));
});

// ── Report a habit ────────────────────────────────────────────────────────────

router.post("/habits/:id/report", optionalAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ReportHabitParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ReportHabitBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [habit] = await db
    .select({ id: habitsTable.id, reportCount: habitsTable.reportCount, flagged: habitsTable.flagged })
    .from(habitsTable)
    .where(eq(habitsTable.id, params.data.id));

  if (!habit) {
    res.status(404).json({ error: "Habit not found" });
    return;
  }

  const reporterId = req.user?.userId ?? null;

  // If logged in, check for duplicate by userId+habitId (unique constraint only covers sessionId)
  if (reporterId !== null) {
    const [existing] = await db
      .select({ id: reportsTable.id })
      .from(reportsTable)
      .where(
        and(
          eq(reportsTable.habitId, params.data.id),
          eq(reportsTable.userId, reporterId),
        )
      )
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "Already reported" });
      return;
    }
  }

  // Insert report — unique constraint on (habitId, sessionId) catches anonymous duplicates
  try {
    await db.insert(reportsTable).values({
      habitId: params.data.id,
      userId: reporterId,
      sessionId: body.data.sessionId,
      reason: body.data.reason,
    });
  } catch {
    // Unique constraint violation on sessionId — already reported anonymously
    res.status(409).json({ error: "Already reported" });
    return;
  }

  // Increment count; flag immediately on first report (FLAG_THRESHOLD = 1)
  const newCount = habit.reportCount + 1;
  const nowFlagged = newCount >= FLAG_THRESHOLD;

  const [updated] = await db
    .update(habitsTable)
    .set({ reportCount: newCount, flagged: nowFlagged || habit.flagged })
    .where(eq(habitsTable.id, params.data.id))
    .returning({ reportCount: habitsTable.reportCount, flagged: habitsTable.flagged });

  res.json(ReportHabitResponse.parse({
    reported: true,
    flagged: updated.flagged,
    reportCount: updated.reportCount,
  }));
});

// ── Admin: flagged habits ─────────────────────────────────────────────────────

router.get("/admin/flagged-habits", async (req, res): Promise<void> => {
  const flagged = await db
    .select({
      id: habitsTable.id,
      question: habitsTable.question,
      category: habitsTable.category,
      source: habitsTable.source,
      status: habitsTable.status,
      reportCount: habitsTable.reportCount,
      flagged: habitsTable.flagged,
    })
    .from(habitsTable)
    .where(eq(habitsTable.flagged, true))
    .orderBy(desc(habitsTable.reportCount));

  // For each flagged habit, get per-reason counts
  const result = await Promise.all(
    flagged.map(async (h) => {
      const reasons = await db
        .select({ reason: reportsTable.reason, count: count(reportsTable.id) })
        .from(reportsTable)
        .where(eq(reportsTable.habitId, h.id))
        .groupBy(reportsTable.reason)
        .orderBy(desc(count(reportsTable.id)));

      return {
        ...h,
        topReasons: reasons.map((r) => ({ reason: r.reason, count: Number(r.count) })),
      };
    })
  );

  res.json(GetFlaggedHabitsResponse.parse(result));
});

// ── Admin: dismiss flag or archive flagged habit ──────────────────────────────

router.patch("/admin/flagged-habits/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateFlaggedHabitParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateFlaggedHabitBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [habit] = await db
    .select()
    .from(habitsTable)
    .where(eq(habitsTable.id, params.data.id));

  if (!habit) {
    res.status(404).json({ error: "Habit not found" });
    return;
  }

  if (body.data.action === "dismiss") {
    // Clear flag + wipe all reports for this habit
    await db.delete(reportsTable).where(eq(reportsTable.habitId, params.data.id));
    await db
      .update(habitsTable)
      .set({ flagged: false, reportCount: 0 })
      .where(eq(habitsTable.id, params.data.id));
  } else if (body.data.action === "archive") {
    await db
      .update(habitsTable)
      .set({ status: "archived" })
      .where(eq(habitsTable.id, params.data.id));
  }

  res.json({ ok: true });
});

// ── Admin: list all habits ────────────────────────────────────────────────────

router.get("/admin/habits", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: habitsTable.id,
      question: habitsTable.question,
      category: habitsTable.category,
      source: habitsTable.source,
      status: habitsTable.status,
      reportCount: habitsTable.reportCount,
      flagged: habitsTable.flagged,
      createdAt: habitsTable.createdAt,
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
    .groupBy(habitsTable.id)
    .orderBy(desc(habitsTable.createdAt));

  const parsed = rows.map((r) => ({
    ...r,
    meTooPct: Number(r.meTooPct),
    answerCount: Number(r.answerCount),
  }));

  res.json(ListAdminHabitsResponse.parse(parsed));
});

// ── Admin: delete (archive) habit ─────────────────────────────────────────────

router.delete("/admin/habits/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteHabitParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [habit] = await db
    .select()
    .from(habitsTable)
    .where(eq(habitsTable.id, params.data.id));

  if (!habit) {
    res.status(404).json({ error: "Habit not found" });
    return;
  }

  await db
    .update(habitsTable)
    .set({ status: "archived" })
    .where(eq(habitsTable.id, params.data.id));

  res.json({ ok: true });
});

// ── Admin: edit habit ─────────────────────────────────────────────────────────

router.patch("/admin/habits/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateHabitParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateHabitBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(habitsTable)
    .set(body.data)
    .where(eq(habitsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Habit not found" });
    return;
  }

  const [row] = await db
    .select({
      id: habitsTable.id,
      question: habitsTable.question,
      category: habitsTable.category,
      meTooPct: sql<string>`
        CASE
          WHEN COUNT(${answersTable.id}) = 0 THEN ${habitsTable.meTooPctDefault}::numeric
          ELSE ROUND(SUM(CASE WHEN ${answersTable.answer} = 'me_too' THEN 100.0 ELSE 0 END) / COUNT(${answersTable.id}))
        END
      `,
      traits: habitsTable.traits,
      source: habitsTable.source,
      status: habitsTable.status,
      answerCount: count(answersTable.id),
      reportCount: habitsTable.reportCount,
      flagged: habitsTable.flagged,
    })
    .from(habitsTable)
    .leftJoin(answersTable, eq(answersTable.habitId, habitsTable.id))
    .where(eq(habitsTable.id, updated.id))
    .groupBy(habitsTable.id);

  res.json(UpdateHabitResponse.parse({ ...row, meTooPct: Number(row.meTooPct), answerCount: Number(row.answerCount) }));
});

export default router;
