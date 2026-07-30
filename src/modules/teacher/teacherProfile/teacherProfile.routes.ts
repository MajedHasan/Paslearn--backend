import { Router } from "express";
import { teacherUpload } from "./teacherUpload";
import {
  createTeacherApplicationController,
  getTeacherProfileController,
  updateTeacherProfileController,
} from "./teacherProfile.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";

const router = Router();

// Use multer fields to accept multiple file types
const uploadFields = teacherUpload.fields([
  { name: "photo", maxCount: 1 },
  { name: "recommendationImage", maxCount: 1 },
]);

// Teacher applies (POST /api/teacher/apply)
router.post(
  "/apply",
  requireAuth,
  uploadFields,
  createTeacherApplicationController
);

// Get own profile
router.get("/", requireAuth, getTeacherProfileController);

// Update profile
router.patch("/", requireAuth, updateTeacherProfileController);

export default router;