import { Router } from "express";
import { publicCourseController } from "./publicCourse.controller";

const router = Router();

router.get("/:slug/lessons/:lessonId/preview", publicCourseController.preview);
router.get("/:slug", publicCourseController.get);
router.get("/", publicCourseController.list);

export default router;