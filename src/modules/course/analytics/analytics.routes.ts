import { Router } from "express";
import { analyticsController } from "./analytics.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();
router.use(requireAuth);
router.get("/teacher", requireRole("teacher", "admin"), analyticsController.teacher);
router.get("/teacher/courses/:courseId", requireRole("teacher", "admin"), analyticsController.course);
router.post("/track", analyticsController.track);

export default router;