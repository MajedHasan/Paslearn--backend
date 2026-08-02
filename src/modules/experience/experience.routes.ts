import { Router } from "express";

import {
  createExperienceController,
  deleteExperienceController,
  getActiveExperiencesController,
  getAllExperiencesController,
  getExperienceByIdController,
  getExperienceByKeyController,
  getExperienceAnalyticsController,
  toggleExperienceController,
  updateExperienceController,
  recordImpressionController,
} from "./experience.controller";

import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
router.get("/public", getActiveExperiencesController);

/*
|--------------------------------------------------------------------------
| Admin Routes
|--------------------------------------------------------------------------
*/
router.post(
  "/admin",
  requireAuth,
  requireRole("admin"),
  createExperienceController,
);

router.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  getAllExperiencesController,
);

router.get(
  "/admin/:id",
  requireAuth,
  requireRole("admin"),
  getExperienceByIdController,
);

router.get(
  "/admin/:id/analytics",
  requireAuth,
  requireRole("admin"),
  getExperienceAnalyticsController,
);

router.get(
  "/admin/key/:key",
  requireAuth,
  requireRole("admin"),
  getExperienceByKeyController,
);

router.patch(
  "/admin/:id",
  requireAuth,
  requireRole("admin"),
  updateExperienceController,
);

router.patch(
  "/admin/:id/toggle",
  requireAuth,
  requireRole("admin"),
  toggleExperienceController,
);

router.delete(
  "/admin/:id",
  requireAuth,
  requireRole("admin"),
  deleteExperienceController,
);

router.post("/public/impression", recordImpressionController);


export default router;