import { Router } from "express";

import ExperienceController from "./experience.controller";

// Your auth middlewares
// Example:
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
| Used by frontend runtime
| Example:
| app/layout.tsx
|--------------------------------------------------------------------------
*/

router.get("/public", ExperienceController.getActiveExperiences);

/*
|--------------------------------------------------------------------------
| Admin Routes
|--------------------------------------------------------------------------
*/

router.post(
  "/admin",
  requireAuth,
  requireRole("admin"),
  ExperienceController.createExperience,
);

router.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  ExperienceController.getAllExperiences,
);

router.get(
  "/admin/:id",
  requireAuth,
  requireRole("admin"),
  ExperienceController.getExperienceById,
);

router.patch(
  "/admin/:id",
  requireAuth,
  requireRole("admin"),
  ExperienceController.updateExperience,
);

router.patch(
  "/admin/:id/toggle",
  requireAuth,
  requireRole("admin"),
  ExperienceController.toggleExperience,
);

router.delete(
  "/admin/:id",
  requireAuth,
  requireRole("admin"),
  ExperienceController.deleteExperience,
);

export default router;
