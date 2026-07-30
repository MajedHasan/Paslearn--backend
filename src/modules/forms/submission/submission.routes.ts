import { Router } from "express";
import SubmissionController from "./submission.controller";
import { submissionUpload } from "./submissionUpload";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();

// Public submission endpoint – accepts multipart
router.post(
  "/public/:key",
  submissionUpload.any(), // any field name for file uploads
  SubmissionController.createPublicSubmission
);

// Admin routes
router.get("/admin", requireAuth, requireRole("admin"), SubmissionController.getAll);
router.get("/admin/:id", requireAuth, requireRole("admin"), SubmissionController.getById);
router.patch("/admin/:id/status", requireAuth, requireRole("admin"), SubmissionController.updateStatus);

export default router;