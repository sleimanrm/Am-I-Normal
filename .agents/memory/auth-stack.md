---
name: Auth stack
description: How JWT authentication is wired across backend and frontend in this project.
---

## Backend
- `bcryptjs` + `jsonwebtoken` in `artifacts/api-server`
- `JWT_SECRET` env var (already set)
- Middleware: `artifacts/api-server/src/middlewares/auth.ts` — exports `optionalAuth`, `requireAuth`, `AuthPayload`
- Routes: `artifacts/api-server/src/routes/auth.ts` — POST `/api/auth/signup`, POST `/api/auth/login`, GET `/api/auth/me`
- Answers route requires auth (blocks duplicate votes, stores userId)
- Submissions POST and GET /mine require auth (stores submitterUserId)

## Frontend
- `AuthProvider` wraps app in `artifacts/am-i-normal/src/main.tsx`
- `AuthContext` at `artifacts/am-i-normal/src/contexts/AuthContext.tsx`:
  - Reads JWT from `localStorage` key `ain_jwt`
  - Decodes payload (userId, email, exp) without a library — manual `atob(token.split(".")[1])`
  - Calls `setAuthTokenGetter(() => token)` from `@workspace/api-client-react` so ALL generated hooks automatically include `Authorization: Bearer <token>`
  - `AuthUser.createdAt` is `string` in the generated type (not `Date`) — use `new Date().toISOString()`
- Login/Signup screens: `artifacts/am-i-normal/src/pages/LoginScreen.tsx` and `SignupScreen.tsx`
- `LoginPromptModal`: reusable modal with Sign Up / Log In buttons
- GameScreen: swipe-to-vote requires auth — shows `LoginPromptModal` if not logged in
- SubmitScreen: submit requires auth — shows `LoginPromptModal` if not logged in  
- MyHabitsScreen: shows login prompt if not authed; uses JWT (no sessionId needed for GET /submissions/mine)
- Bottom nav dock: shows User icon (→ /login) when logged out, LogOut icon when logged in

## Key wiring detail
`setAuthTokenGetter` in `lib/api-client-react/src/custom-fetch.ts` is the injection point — calling it with `() => token` makes every generated hook send the Bearer token automatically.
