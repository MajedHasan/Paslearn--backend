import { Router } from "express";
import { courseAiController } from "./ai.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

// Teacher/student-facing router — mounted at /api/course-ai
const router = Router();
router.use(requireAuth, requireRole("teacher", "admin"));

router.get("/provider", courseAiController.providerInfo);

router.post("/jobs", courseAiController.enqueue);
router.post("/jobs/run", courseAiController.runNow);
router.get("/jobs", courseAiController.list);
router.get("/jobs/:id", courseAiController.get);
router.post("/jobs/:id/process", courseAiController.process);
router.post("/jobs/:id/cancel", courseAiController.cancel);
router.post("/jobs/:id/retry", courseAiController.retry);

export const courseAiRoutes = router;

// Admin router — mounted at /api/admin/course-ai
export const adminCourseAiRoutes = Router();
adminCourseAiRoutes.use(requireAuth, requireRole("admin"));
adminCourseAiRoutes.get("/jobs", courseAiController.adminList);
adminCourseAiRoutes.get("/stats", courseAiController.adminStats);