import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { VerifyAdminPinBody } from "@workspace/api-zod";
import { JWT_SECRET } from "../middlewares/auth";

const router: IRouter = Router();

const configuredAdminPin = process.env.ADMIN_PIN;

if (
  process.env.NODE_ENV === "production" &&
  (!configuredAdminPin || configuredAdminPin === "0000")
) {
  throw new Error("ADMIN_PIN must be set to a non-default value in production.");
}

const ADMIN_PIN = configuredAdminPin ?? "0000";
const ADMIN_TOKEN_TTL = "8h";

router.post("/admin/auth", (req, res): void => {
  const body = VerifyAdminPinBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.pin === ADMIN_PIN) {
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: ADMIN_TOKEN_TTL });
    res.json({ ok: true, token });
  } else {
    res.json({ ok: false });
  }
});

export default router;
