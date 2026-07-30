import { Router } from "express";
import {
  createThemeController,
  getAllThemesController,
  getActiveThemesController,
  getThemeByIdController,
  getThemeBySlugController,
  updateThemeController,
  deleteThemeController,
  toggleThemeActiveController,
} from "./theme.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();

// Admin routes
router.post("/admin", requireAuth, requireRole("admin"), createThemeController);
router.get("/admin", requireAuth, requireRole("admin"), getAllThemesController);
router.get("/admin/:id", requireAuth, requireRole("admin"), getThemeByIdController);
router.patch("/admin/:id", requireAuth, requireRole("admin"), updateThemeController);
router.patch("/admin/:id/toggle", requireAuth, requireRole("admin"), toggleThemeActiveController);
router.delete("/admin/:id", requireAuth, requireRole("admin"), deleteThemeController);

// Public routes
router.get("/", getActiveThemesController);
router.get("/slug/:slug", getThemeBySlugController);
router.get("/:id", getThemeByIdController);

export default router;