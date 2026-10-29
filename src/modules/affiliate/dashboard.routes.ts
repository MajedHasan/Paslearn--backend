
// affiliate/dashboard.routes.ts
import { Router } from "express";
import { affiliateController } from "./dashboard.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();
router.use(requireAuth);

router.get("/overview", affiliateController.overview);
router.get("/referrals", affiliateController.referrals);
router.post("/payouts", affiliateController.requestPayout);

export default router;

export const adminAffiliateRoutes = Router();
adminAffiliateRoutes.use(requireAuth, requireRole("admin"));
adminAffiliateRoutes.post("/payouts/:id/approve", affiliateController.adminApprovePayout);