// src/modules/course/review/adminReviewModeration.routes.ts
import { Router } from "express";
import { adminReviewModerationController } from "./adminReviewModeration.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/counts", adminReviewModerationController.counts);
router.get("/", adminReviewModerationController.list);

router.patch("/:id/hide", adminReviewModerationController.hide);
router.patch("/:id/show", adminReviewModerationController.show);
router.delete("/:id", adminReviewModerationController.remove);

export default router;