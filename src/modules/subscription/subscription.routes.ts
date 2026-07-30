import { Router } from "express";
import {
  createSubscriptionController,
  getAllSubscriptionsController,
  getUserSubscriptionsController,
  getSubscriptionByIdController,
  updateSubscriptionController,
  cancelSubscriptionController,
  getActiveSubscriptionController,
} from "./subscription.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();

// Authenticated user routes
router.post("/", requireAuth, createSubscriptionController);
router.get("/my", requireAuth, getUserSubscriptionsController);
router.get("/active", requireAuth, getActiveSubscriptionController);

// Cancel (both user and admin)
router.patch("/:id/cancel", requireAuth, cancelSubscriptionController);

// Admin routes
router.get("/admin", requireAuth, requireRole("admin"), getAllSubscriptionsController);
router.get("/admin/:id", requireAuth, requireRole("admin"), getSubscriptionByIdController);
router.patch("/admin/:id", requireAuth, requireRole("admin"), updateSubscriptionController);

export default router;