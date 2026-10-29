import { Router } from "express";
import { reviewController } from "./review.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

// ── Public / student router (mounted at /api/reviews) ──
const router = Router();

router.get("/courses/:courseId/reviews", reviewController.listForCourse);

router.use(requireAuth);
router.post("/courses/:courseId/reviews", reviewController.create);
router.post("/reviews/:id/helpful", reviewController.markHelpful);
router.post("/reviews/:id/flag", reviewController.flag);

export default router;

// ── Teacher router (mounted at /api/teacher/reviews) ──
export const teacherReviewRoutes = Router();
teacherReviewRoutes.use(requireAuth, requireRole("teacher", "admin"));

teacherReviewRoutes.get("/", reviewController.listForTeacher);
teacherReviewRoutes.post("/:id/reply", reviewController.reply);
teacherReviewRoutes.patch("/:id/status", reviewController.setStatus);

// ── Admin router (mounted at /api/admin/reviews) ──
export const adminReviewRoutes = Router();
adminReviewRoutes.use(requireAuth, requireRole("admin"));
adminReviewRoutes.patch("/:id/status", reviewController.adminModerate);