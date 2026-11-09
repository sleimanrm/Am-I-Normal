import { Router, type IRouter } from "express";
import { db, answersTable, habitsTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { RecordAnswerBody } from "@workspace/api-zod";
import { optionalAuth, requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const VOTE_RATE_LIMIT = 20;

// Postgres unique violation error code
const UNIQUE_VIOLATION = "23505";

// Helper to time database queries
async function timeQuery<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = process.hrtime.bigint();
  try {
    return await fn();
  } finally {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info({ label, durationMs: Math.round(durationMs * 100) / 100 }, "db.query");
  }
}

router.get("/answers/voted", optionalAuth, requireAuth, async (req, res): Promise<void> => {
  const rows = await timeQuery("GET /api/answers/voted", async () => {
    return await db
      .select({ habitId: answersTable.habitId })
      .from(answersTable)
      .where(eq(answersTable.userId, req.user!.userId));
  });

  logger.info({ label: "GET /api/answers/voted", rowCount: rows.length }, "db.query.result");
  res.json(rows.map((r) => r.habitId));
});

router.post("/answers", optionalAuth, requireAuth, async (req, res): Promise<void> => {
  const body = RecordAnswerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const userId = req.user!.userId;

  // Rate limit: 20 votes per minute per user
  const [{ voteCount }] = await db
    .select({ voteCount: count() })
    .from(answersTable)
    .where(
      and(
        eq(answersTable.userId, userId),
        sql`${answersTable.answeredAt} > NOW() - INTERVAL '1 minute'`
      )
    );
  if (voteCount >= VOTE_RATE_LIMIT) {
    res.status(429).json({ error: "Too many votes. Please wait a minute before voting again." });
    return;
  }

  const [habit] = await db
    .select({ id: habitsTable.id })
    .from(habitsTable)
    .where(eq(habitsTable.id, body.data.habitId));

  if (!habit) {
    res.status(400).json({ error: "Habit not found" });
    return;
  }

  const [existingVote] = await db
    .select({ id: answersTable.id })
    .from(answersTable)
    .where(
      and(
        eq(answersTable.habitId, body.data.habitId),
        eq(answersTable.userId, userId),
      ),
    );

  if (existingVote) {
    res.status(409).json({ error: "Already voted on this habit" });
    return;
  }

  try {
    const [answer] = await db
      .insert(answersTable)
      .values({
        habitId: body.data.habitId,
        sessionId: body.data.sessionId,
        answer: body.data.answer,
        userId,
      })
      .returning();

    res.status(201).json({
      id: answer.id,
      habitId: answer.habitId,
      sessionId: answer.sessionId,
      answer: answer.answer,
      answeredAt: answer.answeredAt,
    });
  } catch (err: unknown) {
    // Defense-in-depth: handle unique constraint violation from partial unique index
    // Catches race condition where concurrent requests both pass the application-level check
    if (err instanceof Error && "code" in err && (err as { code: string }).code === UNIQUE_VIOLATION) {
      res.status(409).json({ error: "Already voted on this habit" });
      return;
    }
    throw err;
  }
});

export default router;
