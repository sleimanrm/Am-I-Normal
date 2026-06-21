---
name: Orval schema naming conflict
description: How component schema names interact with orval's dual-output (Zod + TS types) codegen, causing TS2308 re-export conflicts.
---

## Rule
Never name OpenAPI component schemas with names that end in `Body` (e.g. `LoginBody`, `SignupBody`).

## Why
Orval's `zod` output generates two artifacts from `components/schemas`:
1. `lib/api-zod/src/generated/api.ts` — a Zod const with the schema name (e.g. `export const LoginBody = zod.object(...)`)
2. `lib/api-zod/src/generated/types/loginBody.ts` — a TS interface with the same name (e.g. `export interface LoginBody {...}`)

`lib/api-zod/src/index.ts` (auto-regenerated, cannot be edited) does `export * from "./generated/api"` and `export * from './generated/types'`. When both modules export the same identifier, TypeScript TS2308 fires: "Module X has already exported a member named Y."

Orval uses schema name directly when it ends in "Body" (matching its own convention). For other names (e.g. `AnswerInput`), orval generates a different name in api.ts from the operationId (`RecordAnswerBody`) — no conflict.

## How to apply
Name request body component schemas with `Input` suffix instead of `Body`:
- `LoginInput` not `LoginBody`
- `SignupInput` not `SignupBody`

After codegen, the Zod schemas in api.ts will be auto-named `LoginBody`/`SignupBody` from the operationId convention, while types/ will have `LoginInput`/`SignupInput` — no overlap.

Backend routes import the orval-generated Zod names (e.g. `LoginBody`, `SignupBody` from `@workspace/api-zod`).
