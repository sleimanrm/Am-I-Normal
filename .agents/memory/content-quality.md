---
name: Content quality protections
description: Rate limits, fuzzy duplicate detection, and moderation logging for the Am I Normal app
---

## Rules

- Submission rate limit: 5 per user per day (checked against submissionsTable via SQL interval `> NOW() - INTERVAL '1 day'`)
- Vote rate limit: 20 per user per minute (checked against answersTable)
- Report rate limit: 20 per user per day (checked against reportsTable, logged-in users only)
- Exact duplicates: hard 409 block — checks both `habitsTable` and `submissionsTable` (pending/approved) via `LOWER(TRIM(question)) = normalised`
- Fuzzy duplicates: soft warning — uses `pg_trgm similarity() > 0.6`; submission still created, response includes `similarityWarning` field; wrapped in try/catch in case extension not available

## pg_trgm

Must be enabled once per DB: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
The extension persists in the database — no need to re-enable unless DB is dropped.

**Why:** PostgreSQL's trigram similarity is the right tool for short-sentence fuzzy matching.
**How to apply:** Use `db.execute(sql`SELECT ... WHERE similarity(...) > 0.6`)` with a try/catch fallback.

## Moderation log

Table: `moderation_logs` — columns: id, habitId (FK nullable), action (text), actorUserId (FK nullable), note (text), createdAt.
Actions written: `reported` (in habits.ts report route), `approved`/`rejected` (in submissions.ts admin patch), `deleted`/`dismissed` (in habits.ts admin routes).
Admin endpoint: `GET /api/admin/moderation-logs?habitId=N` (last 200 entries, or filtered by habitId).
