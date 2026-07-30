import { Router } from "express";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

import {
  createThemeCategoryController,
  getAllThemeCategoriesController,
  getThemeCategoryByIdController,
  updateThemeCategoryController,
  deleteThemeCategoryController,
} from "./themeCategory.controller";


const router = Router();
router.post("/", requireAuth, requireRole("admin"), createThemeCategoryController);
router.get("/", requireAuth, requireRole("admin"), getAllThemeCategoriesController);
router.get("/:id", requireAuth, requireRole("admin"), getThemeCategoryByIdController);
router.patch("/:id", requireAuth, requireRole("admin"), updateThemeCategoryController);
router.delete("/:id", requireAuth, requireRole("admin"), deleteThemeCategoryController);

// Public routes
router.get("/", getAllThemeCategoriesController);
router.get("/:id", getThemeCategoryByIdController);

export default router;