import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { VerifyAdminPinBody } from "@workspace/api-zod";
import { JWT_SECRET } from "../middlewares/auth";

const router: IRouter = Router();

// ADMIN_PIN must be set in environment — no default, fail closed if missing
const adminPin = process.env.ADMIN_PIN;
if (!adminPin) {
  throw new Error("ADMIN_PIN environment variable is required but not set");
}

// Enforce minimum PIN strength — 8 digits minimum
if (adminPin.length < 8) {
  throw new Error("ADMIN_PIN must be at least 8 digits");
}
if (!/^\d+$/.test(adminPin)) {
  throw new Error("ADMIN_PIN must contain only digits");
}
// Reject obvious sequential patterns
if (/^12345678$/.test(adminPin) || /^87654321$/.test(adminPin)) {
  throw new Error("ADMIN_PIN must not be a sequentially increasing or decreasing pattern");
}
// Reject repeated digits (already covered by regex but explicit for clarity)
if (/^(\d)\1+$/.test(adminPin)) {
  throw new Error("ADMIN_PIN must not be a repeating pattern");
}

const ADMIN_TOKEN_TTL = "8h";

router.post("/admin/auth", (req, res): void => {
  const body = VerifyAdminPinBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.pin === adminPin) {
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: ADMIN_TOKEN_TTL });
    res.json({ ok: true, token });
  } else {
    res.json({ ok: false });
  }
});

export default router;
