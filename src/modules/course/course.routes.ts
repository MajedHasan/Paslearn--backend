// src/modules/course/course.routes.ts
import { Router } from "express";
import { courseController } from "./course.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { uploadMiddleware } from "../../middlewares/upload.middleware";
import courseModel from "./course.model";

const router = Router();

router.use(requireAuth);
router.use(requireRole("teacher", "admin"));

// ── Stats ──
router.get("/stats", courseController.stats);

// ── Lifecycle ──
router.post("/:id/publish", courseController.publish);
router.post("/:id/archive", courseController.archive);
router.post("/:id/pause-enrollments", courseController.pauseEnrollments);

// ── Delete / Restore / Retention ──
router.post("/:id/delete", courseController.softDelete);      // ⭐ with body { reason? }
router.delete("/:id", courseController.delete);                // legacy alias
router.post("/:id/restore", courseController.restore);
router.get("/:id/deletion-info", courseController.deletionInfo);

// ── Reorder ──
router.put("/:id/sections/order", courseController.reorderSections);
router.put("/:id/sections/:sectionId/lessons/order", courseController.reorderLessons);

// ── Duplicate + bulk ──
router.post("/:id/duplicate", courseController.duplicate);
router.post("/bulk-delete", courseController.bulkDelete);

// ── Uploads ──
router.post("/:id/thumbnail", uploadMiddleware.single("file"), courseController.uploadThumbnail);
router.post(
  "/:id/sections/:sectionId/lessons/:lessonId/video",
  uploadMiddleware.single("file"),
  courseController.uploadLessonVideo
);
router.post(
  "/:id/sections/:sectionId/lessons/:lessonId/file",
  uploadMiddleware.single("file"),
  courseController.uploadLessonFile
);

// ── Media preview (teacher edit) ──
router.get(
  "/:id/sections/:sectionId/lessons/:lessonId/media",
  courseController.getLessonMedia
);

// ── Students ──
router.get("/:id/students", async (req, res, next) => {
  try {
    const EnrollmentModel = (await import("./enrollment/enrollment.model")).default;
    const course = await courseModel.findOne({ _id: req.params.id, teacher: (req as any).user.sub });
    if (!course) return res.status(404).json({ success: false, message: "Not found" });
    const students = await EnrollmentModel.find({ course: req.params.id })
      .populate("user", "name email profileImageUrl")
      .sort({ enrolledAt: -1 })
      .lean();
    res.json({ success: true, data: students, total: students.length });
  } catch (e) { next(e); }
});

// ── Base CRUD (must come LAST so :id doesn't swallow named routes) ──
router.get("/", courseController.list);
router.get("/:id", courseController.get);
router.post("/", courseController.create);
router.put("/:id", courseController.update);

export default router;