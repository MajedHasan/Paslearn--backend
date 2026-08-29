// src/modules/course/course.routes.ts
import { Router } from "express";
import { courseController } from "./course.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { uploadMiddleware } from "../../middlewares/upload.middleware";

const router = Router();

router.use(requireAuth);

// Stats must come before /:id to avoid conflict
router.get("/stats", courseController.stats);

// Base CRUD (list, get, create, update, delete)
router.get("/", courseController.list);
router.get("/:id", courseController.get);
router.post("/", courseController.create);
router.put("/:id", courseController.update);
router.delete("/:id", courseController.delete);

// Thumbnail upload
router.post("/:id/thumbnail", uploadMiddleware.single("file"), courseController.uploadThumbnail);

// Lesson video upload
router.post(
  "/:id/sections/:sectionId/lessons/:lessonId/video",
  uploadMiddleware.single("file"),
  courseController.uploadLessonVideo
);

// Lesson file upload
router.post(
  "/:id/sections/:sectionId/lessons/:lessonId/file",
  uploadMiddleware.single("file"),
  courseController.uploadLessonFile
);

// Start transcoding for lesson video
router.post(
  "/:id/sections/:sectionId/lessons/:lessonId/transcode",
  courseController.transcodeLessonVideo
);

export default router;