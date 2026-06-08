import { Router, type IRouter } from "express";
import { db, answersTable, habitsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RecordAnswerBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/answers", async (req, res): Promise<void> => {
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

  const [answer] = await db
    .insert(answersTable)
    .values({
      habitId: body.data.habitId,
      sessionId: body.data.sessionId,
      answer: body.data.answer,
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
