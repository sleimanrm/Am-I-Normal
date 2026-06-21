import { Router, type IRouter } from "express";
import { db, submissionsTable, habitsTable, answersTable, moderationLogsTable } from "@workspace/db";
import { eq, sql, count, or, and } from "drizzle-orm";
import {
  CreateSubmissionBody,
  ListSubmissionsResponse,
  ListSubmissionsQueryParams,
  UpdateSubmissionBody,
  UpdateSubmissionParams,
  UpdateSubmissionResponse,
  GetMySubmissionsResponse,
} from "@workspace/api-zod";
import { optionalAuth, requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const SUBMISSION_DAILY_LIMIT = 5;
const SIMILARITY_THRESHOLD = 0.6;
const VALID_SUBMISSION_STATUSES = ["pending", "approved", "rejected"] as const;

router.post("/submissions", optionalAuth, requireAuth, async (req, res): Promise<void> => {
  const body = CreateSubmissionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const userId = req.user!.userId;
  const normalised = body.data.question.trim().toLowerCase();

  // Rate limit: 5 submissions per user per day
  const [{ dailyCount }] = await db
    .select({ dailyCount: count() })
    .from(submissionsTable)
    .where(
      and(
        eq(submissionsTable.submitterUserId, userId),
        sql`${submissionsTable.submittedAt} > NOW() - INTERVAL '1 day'`
      )
    );
  if (dailyCount >= SUBMISSION_DAILY_LIMIT) {
    res.status(429).json({ error: "You can submit up to 5 habits per day. Try again tomorrow." });
    return;
  }

  // Exact duplicate check against live habits
  const existingHabit = await db
    .select({ id: habitsTable.id })
    .from(habitsTable)
    .where(sql`LOWER(TRIM(${habitsTable.question})) = ${normalised}`)
    .limit(1);

  // Exact duplicate check against pending/approved submissions
  const existingSubmission = await db
    .select({ id: submissionsTable.id })
    .from(submissionsTable)
    .where(
      or(
        sql`LOWER(TRIM(${submissionsTable.question})) = ${normalised} AND ${submissionsTable.status} != 'rejected'`,
      ),
    )
    .limit(1);

  if (existingHabit.length > 0 || existingSubmission.length > 0) {
    res.status(409).json({ error: "This habit has already been submitted." });
    return;
  }

  // Fuzzy similarity check via pg_trgm (non-blocking: creates submission but warns)
  let similarityWarning: string | null = null;
  try {
    const { rows: similarHabits } = await db.execute(
      sql`SELECT id FROM habits WHERE similarity(lower(trim(question)), ${normalised}) > ${SIMILARITY_THRESHOLD} LIMIT 1`
    );
    const { rows: similarSubs } = await db.execute(
      sql`SELECT id FROM submissions WHERE similarity(lower(trim(question)), ${normalised}) > ${SIMILARITY_THRESHOLD} AND status != 'rejected' LIMIT 1`
    );
    if (similarHabits.length > 0 || similarSubs.length > 0) {
      similarityWarning = "A similar habit may already exist.";
    }
  } catch {
    // pg_trgm not available — skip fuzzy check
  }

  const [submission] = await db
    .insert(submissionsTable)
    .values({
      question: body.data.question.trim(),
      status: "pending",
      submitterSessionId: body.data.sessionId ?? null,
      submitterUserId: userId,
    })
    .returning();

  res.status(201).json({
    id: submission.id,
    question: submission.question,
    status: submission.status,
    submittedAt: submission.submittedAt,
    habitId: submission.habitId ?? null,
    moderationReason: submission.moderationReason ?? null,
    similarityWarning,
  });
});

router.get("/submissions/mine", optionalAuth, requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: submissionsTable.id,
      question: submissionsTable.question,
      status: submissionsTable.status,
      submittedAt: submissionsTable.submittedAt,
      habitId: submissionsTable.habitId,
      moderationReason: submissionsTable.moderationReason,
      meTooPct: sql<string | null>`
        CASE
          WHEN ${submissionsTable.habitId} IS NULL THEN NULL
          WHEN COUNT(${answersTable.id}) = 0 THEN ${habitsTable.meTooPctDefault}::numeric
          ELSE ROUND(SUM(CASE WHEN ${answersTable.answer} = 'me_too' THEN 100.0 ELSE 0 END) / COUNT(${answersTable.id}))
        END
      `,
      answerCount: count(answersTable.id),
      reportCount: sql<number>`COALESCE(MAX(${habitsTable.reportCount}), 0)`,
    })
    .from(submissionsTable)
    .leftJoin(habitsTable, eq(habitsTable.id, submissionsTable.habitId))
    .leftJoin(answersTable, eq(answersTable.habitId, habitsTable.id))
    .where(eq(submissionsTable.submitterUserId, req.user!.userId))
    .groupBy(submissionsTable.id, habitsTable.id, habitsTable.meTooPctDefault)
    .orderBy(submissionsTable.submittedAt);

  res.json(
    GetMySubmissionsResponse.parse(
      rows.map((r) => ({
        ...r,
        meTooPct: r.meTooPct !== null ? Number(r.meTooPct) : null,
        answerCount: Number(r.answerCount),
        reportCount: Number(r.reportCount),
      })),
    ),
  );
});

// ── Admin: list all submissions ────────────────────────────────────────────────
// requireAdmin: PIN-issued JWT required

router.get("/admin/submissions", requireAdmin, async (req, res): Promise<void> => {
  const query = ListSubmissionsQueryParams.safeParse(req.query);
  const status = query.success ? query.data.status : undefined;

  const rows = status
    ? await db
        .select()
        .from(submissionsTable)
        .where(eq(submissionsTable.status, status))
        .orderBy(submissionsTable.submittedAt)
    : await db.select().from(submissionsTable).orderBy(submissionsTable.submittedAt);

  res.json(ListSubmissionsResponse.parse(rows));
});

// ── Admin: approve / reject submission ────────────────────────────────────────
// requireAdmin: PIN-issued JWT required

router.patch("/admin/submissions/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateSubmissionParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateSubmissionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Validate status enum
  if (body.data.status !== undefined && !VALID_SUBMISSION_STATUSES.includes(body.data.status as typeof VALID_SUBMISSION_STATUSES[number])) {
    res.status(400).json({ error: `status must be one of: ${VALID_SUBMISSION_STATUSES.join(", ")}` });
    return;
  }

  const [existing] = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  const updateValues: Partial<typeof submissionsTable.$inferInsert> = {};
  if (body.data.status !== undefined) updateValues.status = body.data.status;
  if (body.data.question !== undefined) updateValues.question = body.data.question.trim();
  if ("moderationReason" in body.data) updateValues.moderationReason = body.data.moderationReason ?? null;

  let newHabitId: number | null = null;

  if (body.data.status === "approved" && existing.status !== "approved") {
    const question = body.data.question?.trim() ?? existing.question;
    const category = body.data.category?.trim() || "Community";
    const [habit] = await db
      .insert(habitsTable)
      .values({
        question,
        category,
        meTooPctDefault: 50,
        traits: {},
        source: "community",
        status: "active",
      })
      .returning();
    updateValues.habitId = habit.id;
    updateValues.moderationReason = null;
    newHabitId = habit.id;

    // Moderation log: approved
    await db.insert(moderationLogsTable).values({
      habitId: habit.id,
      action: "approved",
      note: null,
    });
  }

  if (body.data.status === undefined && body.data.question && existing.status === "approved" && existing.habitId) {
    await db
      .update(habitsTable)
      .set({ question: body.data.question.trim() })
      .where(eq(habitsTable.id, existing.habitId));
  }

  if (body.data.status === "rejected" && existing.habitId) {
    await db
      .update(habitsTable)
      .set({ status: "archived" })
      .where(eq(habitsTable.id, existing.habitId));
    updateValues.habitId = null;

    // Moderation log: rejected
    await db.insert(moderationLogsTable).values({
      habitId: existing.habitId,
      action: "rejected",
      note: body.data.moderationReason ?? null,
    });
  } else if (body.data.status === "rejected" && !existing.habitId) {
    // Submission rejected before a habit was created
    await db.insert(moderationLogsTable).values({
      habitId: null,
      action: "rejected",
      note: body.data.moderationReason ?? null,
    });
  }

  const [updated] = await db
    .update(submissionsTable)
    .set(updateValues)
    .where(eq(submissionsTable.id, params.data.id))
    .returning();

  void newHabitId;
  res.json(UpdateSubmissionResponse.parse(updated));
});

export default router;
