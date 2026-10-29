import { Router, raw } from "express";
import { webhookController } from "./webhook.controller";

const router = Router();

// Raw body needed for signature verification — must be mounted BEFORE express.json()
router.post("/stripe", raw({ type: "application/json" }), webhookController.stripe);
router.post("/paypal", raw({ type: "application/json" }), webhookController.paypal);

export default router;