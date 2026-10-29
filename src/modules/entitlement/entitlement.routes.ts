import { Router } from "express";
import { entitlementController } from "./entitlement.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();
router.use(requireAuth);
router.get("/my", entitlementController.myList);

export const adminEntitlementRoutes = Router();
adminEntitlementRoutes.use(requireAuth, requireRole("admin"));
adminEntitlementRoutes.post("/grant", entitlementController.adminGrant);
adminEntitlementRoutes.post("/:id/revoke", entitlementController.adminRevoke);

export default router;