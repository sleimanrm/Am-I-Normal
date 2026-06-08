import { Router, type IRouter } from "express";
import { db, habitsTable, answersTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";
import { GetHabitsResponse, UpdateHabitBody, UpdateHabitParams, UpdateHabitResponse } from "@workspace/api-zod";

const router: IRouter = Router();

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
    })
    .from(habitsTable)
    .leftJoin(answersTable, eq(answersTable.habitId, habitsTable.id))
    .where(eq(habitsTable.id, updated.id))
    .groupBy(habitsTable.id);

  res.json(UpdateHabitResponse.parse({ ...row, meTooPct: Number(row.meTooPct), answerCount: Number(row.answerCount) }));
});

export default router;
