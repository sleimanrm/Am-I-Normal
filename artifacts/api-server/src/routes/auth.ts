import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, passwordResetTokensTable, usersTable } from "@workspace/db";
import {
  ConfirmPasswordResetBody,
  LoginBody,
  RequestPasswordResetBody,
  SignupBody,
  ValidatePasswordResetQueryParams,
} from "@workspace/api-zod";
import { optionalAuth, requireAuth, JWT_SECRET } from "../middlewares/auth";
import { sendPasswordResetEmail } from "../lib/mailer";

const router: IRouter = Router();
const JWT_EXPIRES_IN = "30d";
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_MESSAGE =
  "If an account exists for that email, we've sent a password reset link.";
const INVALID_RESET_MESSAGE = "This password reset link is invalid or has expired.";

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const body = SignupBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const email = body.data.email.toLowerCase().trim();
  const { password } = body.data;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (existing) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash })
    .returning();

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const body = LoginBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const email = body.data.email.toLowerCase().trim();
  const { password } = body.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
  });
});

router.post("/auth/password-reset/request", async (req, res): Promise<void> => {
  const body = RequestPasswordResetBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const email = body.data.email.toLowerCase().trim();
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (user) {
    const rawToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokensTable.userId, user.id),
          isNull(passwordResetTokensTable.usedAt),
        ),
      );

    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      tokenHash: hashResetToken(rawToken),
      expiresAt,
    });

    const baseUrl = process.env.APP_BASE_URL?.replace(/\/+$/, "");
    if (!baseUrl) {
      req.log.error("APP_BASE_URL is not configured for password reset emails");
    } else {
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (err) {
        req.log.error({ err }, "Password reset email delivery failed");
      }
    }
  }

  // Keep this response identical for known and unknown addresses.
  res.json({ message: PASSWORD_RESET_MESSAGE });
});

router.get("/auth/password-reset/validate", async (req, res): Promise<void> => {
  const params = ValidatePasswordResetQueryParams.safeParse(req.query);
  if (!params.success) {
    res.json({ valid: false });
    return;
  }

  const [token] = await db
    .select({ id: passwordResetTokensTable.id })
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, hashResetToken(params.data.token)),
        isNull(passwordResetTokensTable.usedAt),
        gt(passwordResetTokensTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  res.json({ valid: !!token });
});

router.post("/auth/password-reset/confirm", async (req, res): Promise<void> => {
  const body = ConfirmPasswordResetBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const passwordHash = await bcrypt.hash(body.data.password, 12);
  const tokenHash = hashResetToken(body.data.token);
  const now = new Date();

  const updated = await db.transaction(async (tx) => {
    const [claimedToken] = await tx
      .update(passwordResetTokensTable)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokensTable.tokenHash, tokenHash),
          isNull(passwordResetTokensTable.usedAt),
          gt(passwordResetTokensTable.expiresAt, now),
        ),
      )
      .returning({ userId: passwordResetTokensTable.userId });

    if (!claimedToken) {
      return false;
    }

    await tx
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, claimedToken.userId));

    return true;
  });

  if (!updated) {
    res.status(400).json({ error: INVALID_RESET_MESSAGE });
    return;
  }

  res.json({ message: "Your password has been updated. You can now log in." });
});

router.get("/auth/me", optionalAuth, requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({ id: user.id, email: user.email, createdAt: user.createdAt.toISOString() });
});

export default router;
