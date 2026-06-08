import { Router, type IRouter } from "express";
import { db, submissionsTable, habitsTable, answersTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";
import {
  CreateSubmissionBody,
  ListSubmissionsResponse,
  ListSubmissionsQueryParams,
  UpdateSubmissionBody,
  UpdateSubmissionParams,
  UpdateSubmissionResponse,
  GetMySubmissionsQueryParams,
  GetMySubmissionsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/submissions", async (req, res): Promise<void> => {
  const body = CreateSubmissionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [submission] = await db
    .insert(submissionsTable)
    .values({
      question: body.data.question.trim(),
      status: "pending",
      submitterSessionId: body.data.sessionId ?? null,
    })
    .returning();

  res.status(201).json({
    id: submission.id,
    question: submission.question,
    status: submission.status,
    submittedAt: submission.submittedAt,
    habitId: submission.habitId ?? null,
    moderationReason: submission.moderationReason ?? null,
  });
});

router.get("/submissions/mine", async (req, res): Promise<void> => {
  const params = GetMySubmissionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

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
    })
    .from(submissionsTable)
    .leftJoin(habitsTable, eq(habitsTable.id, submissionsTable.habitId))
    .leftJoin(answersTable, eq(answersTable.habitId, habitsTable.id))
    .where(eq(submissionsTable.submitterSessionId, params.data.sessionId))
    .groupBy(submissionsTable.id, habitsTable.id, habitsTable.meTooPctDefault)
    .orderBy(submissionsTable.submittedAt);

  res.json(
    GetMySubmissionsResponse.parse(
      rows.map((r) => ({
        ...r,
        meTooPct: r.meTooPct !== null ? Number(r.meTooPct) : null,
        answerCount: Number(r.answerCount),
      }))
    )
  );
});

router.get("/admin/submissions", async (req, res): Promise<void> => {
  const query = ListSubmissionsQueryParams.safeParse(req.query);
  const status = query.success ? query.data.status : undefined;

  const rows = status
    ? await db
        .select()
        .from(submissionsTable)
        .where(eq(submissionsTable.status, status))
        .orderBy(submissionsTable.submittedAt)
    : await db
        .select()
        .from(submissionsTable)
        .orderBy(submissionsTable.submittedAt);

  res.json(ListSubmissionsResponse.parse(rows));
});

router.patch("/admin/submissions/:id", async (req, res): Promise<void> => {
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

  // Approving → create habit if not already approved, clear moderation reason
  if (body.data.status === "approved" && existing.status !== "approved") {
    const question = body.data.question?.trim() ?? existing.question;
    const [habit] = await db
      .insert(habitsTable)
      .values({
        question,
        category: "Community",
        meTooPctDefault: 50,
        traits: {},
        source: "community",
        status: "active",
      })
      .returning();
    updateValues.habitId = habit.id;
    updateValues.moderationReason = null;
  }

  // Editing an already-approved submission → update the associated habit text too
  if (body.data.status === undefined && body.data.question && existing.status === "approved" && existing.habitId) {
    await db
      .update(habitsTable)
      .set({ question: body.data.question.trim() })
      .where(eq(habitsTable.id, existing.habitId));
  }

  // Rejecting → archive associated habit if any
  if (body.data.status === "rejected" && existing.habitId) {
    await db
      .update(habitsTable)
      .set({ status: "archived" })
      .where(eq(habitsTable.id, existing.habitId));
    updateValues.habitId = null;
  }

  const [updated] = await db
    .update(submissionsTable)
    .set(updateValues)
    .where(eq(submissionsTable.id, params.data.id))
    .returning();

  res.json(UpdateSubmissionResponse.parse(updated));
});

export default router;
