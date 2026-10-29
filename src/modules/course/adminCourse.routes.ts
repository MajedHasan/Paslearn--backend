// src/modules/course/adminCourse.routes.ts
import { Router } from "express";
import { adminCourseController } from "./adminCourse.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/", adminCourseController.listAll);
router.get("/stats", adminCourseController.stats);
router.get("/:id", adminCourseController.get);
router.delete("/:id/purge", adminCourseController.purge);
router.post("/cleanup", adminCourseController.cleanupExpired);

export default router;