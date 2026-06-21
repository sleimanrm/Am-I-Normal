import { Router, type IRouter } from "express";
import { db, answersTable, habitsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { RecordAnswerBody } from "@workspace/api-zod";
import { optionalAuth, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/answers/voted", optionalAuth, requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({ habitId: answersTable.habitId })
    .from(answersTable)
    .where(eq(answersTable.userId, req.user!.userId));

  res.json(rows.map((r) => r.habitId));
});

router.post("/answers", optionalAuth, requireAuth, async (req, res): Promise<void> => {
  const body = RecordAnswerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
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
        eq(answersTable.userId, req.user!.userId),
      ),
    );

  if (existingVote) {
    res.status(409).json({ error: "Already voted on this habit" });
    return;
  }

  const [answer] = await db
    .insert(answersTable)
    .values({
      habitId: body.data.habitId,
      sessionId: body.data.sessionId,
      answer: body.data.answer,
      userId: req.user!.userId,
    })
    .returning();

  res.status(201).json({
    id: answer.id,
    habitId: answer.habitId,
    sessionId: answer.sessionId,
    answer: answer.answer,
    answeredAt: answer.answeredAt,
  });
});

export default router;
