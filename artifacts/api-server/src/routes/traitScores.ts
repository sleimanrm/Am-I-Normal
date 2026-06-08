import { Router, type IRouter } from "express";
import { db, traitScoresTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetTraitScoresParams, GetTraitScoresResponse, UpsertTraitScoresBody, UpsertTraitScoresParams, UpsertTraitScoresResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/trait-scores/:sessionId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const params = GetTraitScoresParams.safeParse({ sessionId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select().from(traitScoresTable).where(eq(traitScoresTable.sessionId, params.data.sessionId));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(GetTraitScoresResponse.parse({ sessionId: row.sessionId, scores: row.scores, maxScores: row.maxScores }));
});

router.put("/trait-scores/:sessionId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const params = UpsertTraitScoresParams.safeParse({ sessionId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpsertTraitScoresBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .insert(traitScoresTable)
    .values({ sessionId: params.data.sessionId, scores: body.data.scores, maxScores: body.data.maxScores })
    .onConflictDoUpdate({
      target: traitScoresTable.sessionId,
      set: { scores: body.data.scores, maxScores: body.data.maxScores },
    })
    .returning();

  res.json(UpsertTraitScoresResponse.parse({ sessionId: row.sessionId, scores: row.scores, maxScores: row.maxScores }));
});

export default router;
