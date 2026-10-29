import { Router } from "express";
import { quizController } from "./quiz.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();
router.use(requireAuth);

// Teacher authoring
router.post("/courses/:courseId/quizzes", requireRole("teacher", "admin"), quizController.create);
router.get("/courses/:courseId/quizzes", requireRole("teacher", "admin"), quizController.list);
router.put("/courses/:courseId/quizzes/:quizId", requireRole("teacher", "admin"), quizController.update);
router.delete("/quizzes/:quizId", requireRole("teacher", "admin"), quizController.remove);

// Student flow
router.get("/quizzes/:quizId", quizController.getForStudent);
router.post("/quizzes/:quizId/attempts", quizController.startAttempt);
router.post("/attempts/:attemptId/submit", quizController.submitAttempt);
router.get("/attempts/:attemptId", quizController.getAttemptDetail);

export default router;