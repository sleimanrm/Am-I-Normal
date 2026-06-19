import { Router, type IRouter } from "express";
import { db, habitsTable, answersTable, reportsTable } from "@workspace/db";
import { eq, sql, count, desc } from "drizzle-orm";
import {
  GetHabitsResponse,
  UpdateHabitBody,
  UpdateHabitParams,
  UpdateHabitResponse,
  ReportHabitBody,
  ReportHabitParams,
  ReportHabitResponse,
  GetFlaggedHabitsResponse,
  UpdateFlaggedHabitParams,
  UpdateFlaggedHabitBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const FLAG_THRESHOLD = 3;

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

// ── Report a habit ────────────────────────────────────────────────────────────

router.post("/habits/:id/report", async (req, res): Promise<void> => {
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

  // Insert report — unique constraint prevents duplicate per session+habit
  try {
    await db.insert(reportsTable).values({
      habitId: params.data.id,
      sessionId: body.data.sessionId,
      reason: body.data.reason,
    });
  } catch {
    // Unique constraint violation — already reported
    res.status(409).json({ error: "Already reported" });
    return;
  }

  // Increment count on the habit and flag if threshold reached
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
