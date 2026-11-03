// src/modules/admin/adminDashboard.routes.ts
import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import * as controller from "./adminDashboard.controller";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/dashboard", controller.getDashboardHandler);
router.get("/stats", controller.getStatsHandler);

router.get("/users", controller.listUsersHandler);
router.get("/users/:id", controller.getUserHandler);
router.patch("/users/:id", controller.updateUserHandler);
router.delete("/users/:id", controller.deleteUserHandler);

export default router;