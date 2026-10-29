// src/modules/learning/learning.routes.ts
import { Router } from "express";
import { learningController } from "./learning.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/courses/:slug", learningController.getCourse);
router.get("/courses/:slug/lessons/:lessonId/playback", learningController.getPlaybackUrl);
router.post(
  "/courses/:courseId/sections/:sectionId/lessons/:lessonId/progress",
  learningController.updateProgress
);

export default router;