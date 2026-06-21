import { Router, type IRouter } from "express";
import { VerifyAdminPinBody, VerifyAdminPinResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const ADMIN_PIN = process.env.ADMIN_PIN ?? "0000";

router.post("/admin/auth", (req, res): void => {
  const body = VerifyAdminPinBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  res.json(VerifyAdminPinResponse.parse({ ok: body.data.pin === ADMIN_PIN }));
});

export default router;
