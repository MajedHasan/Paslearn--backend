import { Router } from "express";
import {
  createFeatureController,
  getAllFeaturesController,
  getFeatureByIdController,
  updateFeatureController,
  deleteFeatureController,
} from "./planFeature.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();

// All admin-only
router.post("/", requireAuth, requireRole("admin"), createFeatureController);
router.get("/", requireAuth, requireRole("admin"), getAllFeaturesController);
router.get("/:id", requireAuth, requireRole("admin"), getFeatureByIdController);
router.patch("/:id", requireAuth, requireRole("admin"), updateFeatureController);
router.delete("/:id", requireAuth, requireRole("admin"), deleteFeatureController);

export default router;