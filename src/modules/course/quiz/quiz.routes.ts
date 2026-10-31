// src/modules/course/quiz/quiz.routes.ts
import { Router } from "express";
import { quizController } from "./quiz.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();
router.use(requireAuth);

// ── Teacher authoring ─────────────────────────────────
router.post(
  "/courses/:courseId/quizzes",
  requireRole("teacher", "admin"),
  quizController.create
);
router.get(
  "/courses/:courseId/quizzes",
  requireRole("teacher", "admin"),
  quizController.list
);
router.put(
  "/courses/:courseId/quizzes/:quizId",
  requireRole("teacher", "admin"),
  quizController.update
);
router.delete(
  "/:quizId",
  requireRole("teacher", "admin"),
  quizController.remove
);

// ── Student access ────────────────────────────────────
// Mounted at /api/quizzes, so full paths are:
//   GET  /api/quizzes/:quizId
//   POST /api/quizzes/:quizId/attempts
router.get("/:quizId", quizController.getForStudent);
router.post("/:quizId/attempts", quizController.startAttempt);

export default router;

// ── Attempts router (mounted separately at /api/attempts) ──
export const quizAttemptRoutes = Router();
quizAttemptRoutes.use(requireAuth);

// POST /api/attempts/:attemptId/submit
// GET  /api/attempts/:attemptId
quizAttemptRoutes.post("/:attemptId/submit", quizController.submitAttempt);
quizAttemptRoutes.get("/:attemptId", quizController.getAttemptDetail);