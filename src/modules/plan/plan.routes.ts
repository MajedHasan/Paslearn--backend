import { Router } from "express";
import {
  createPlanController,
  getAllPlansController,
  getActivePlansController,
  getPlanByIdController,
  getPlanBySlugController,
  updatePlanController,
  deletePlanController,
  togglePlanActiveController,
} from "./plan.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();

/*
|--------------------------------------------------------------------------
| Admin routes (must be first to avoid conflict with /:id)
|--------------------------------------------------------------------------
*/
router.post(
  "/admin",
  requireAuth,
  requireRole("admin"),
  createPlanController
);

router.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  getAllPlansController
);

router.get(
  "/admin/:id",
  requireAuth,
  requireRole("admin"),
  getPlanByIdController
);

router.patch(
  "/admin/:id",
  requireAuth,
  requireRole("admin"),
  updatePlanController
);

router.patch(
  "/admin/:id/toggle",
  requireAuth,
  requireRole("admin"),
  togglePlanActiveController
);

router.delete(
  "/admin/:id",
  requireAuth,
  requireRole("admin"),
  deletePlanController
);

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/
router.get("/", getActivePlansController);
router.get("/slug/:slug", getPlanBySlugController);
router.get("/:id", getPlanByIdController);   // must be last

export default router;