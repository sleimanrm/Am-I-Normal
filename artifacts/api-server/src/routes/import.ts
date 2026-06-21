import { Router, type IRouter } from "express";
import { db, habitsTable, moderationLogsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const MAX_BATCH = 200;

interface ImportItem {
  question: string;
  category: string;
}

router.post("/admin/habits/import", requireAdmin, async (req, res): Promise<void> => {
  const body = req.body as { habits?: unknown };

  if (!Array.isArray(body?.habits) || body.habits.length === 0) {
    res.status(400).json({ error: "habits must be a non-empty array" });
    return;
  }
  if (body.habits.length > MAX_BATCH) {
    res.status(400).json({ error: `Maximum ${MAX_BATCH} habits per import` });
    return;
  }

  // Validate each item
  const validated: ImportItem[] = [];
  for (let i = 0; i < body.habits.length; i++) {
    const item = body.habits[i] as Record<string, unknown>;
    if (typeof item?.question !== "string" || item.question.trim().length < 5) {
      res.status(400).json({ error: `Item ${i + 1}: question must be at least 5 characters` });
      return;
    }
    if (typeof item?.category !== "string" || item.category.trim().length === 0) {
      res.status(400).json({ error: `Item ${i + 1}: category must be a non-empty string` });
      return;
    }
    validated.push({
      question: item.question.trim(),
      category: item.category.trim(),
    });
  }

  // Fetch all existing habit questions in one query for duplicate detection
  const existingRows = await db
    .select({ question: habitsTable.question })
    .from(habitsTable);

  const existingSet = new Set(existingRows.map((r) => r.question.trim().toLowerCase()));

  const toInsert: ImportItem[] = [];
  const skippedQuestions: string[] = [];

  for (const item of validated) {
    if (existingSet.has(item.question.toLowerCase())) {
      skippedQuestions.push(item.question);
    } else {
      toInsert.push(item);
      // Mark as known so within-batch duplicates are also caught
      existingSet.add(item.question.toLowerCase());
    }
  }

  // Bulk insert all non-duplicate habits in a single query
  let importedCount = 0;
  if (toInsert.length > 0) {
    const inserted = await db
      .insert(habitsTable)
      .values(
        toInsert.map((h) => ({
          question: h.question,
          category: h.category,
          meTooPctDefault: 50,
          traits: {},
          source: "curated" as const,
          status: "active" as const,
        }))
      )
      .returning({ id: habitsTable.id });

    importedCount = inserted.length;

    // Log a single bulk-import moderation entry
    await db.insert(moderationLogsTable).values({
      habitId: null,
      action: "imported",
      note: `Bulk import: ${importedCount} habits added`,
    });
  }

  res.json({
    imported: importedCount,
    skipped: skippedQuestions.length,
    skippedQuestions,
  });
});

export default router;
