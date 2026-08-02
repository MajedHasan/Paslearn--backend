import { Router } from "express";
import {
  createAutomationController,
  getAllAutomationsController,
  getAutomationByIdController,
  updateAutomationController,
  deleteAutomationController,
  toggleAutomationController,
} from "./automation.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();

// Admin only
router.get("/:id", requireAuth, requireRole("admin"), getAutomationByIdController);
router.patch("/:id", requireAuth, requireRole("admin"), updateAutomationController);
router.patch(
    "/:id/toggle",
    requireAuth,
    requireRole("admin"),
    toggleAutomationController
);
router.delete("/:id", requireAuth, requireRole("admin"), deleteAutomationController);
router.post("/", requireAuth, requireRole("admin"), createAutomationController);
router.get("/", requireAuth, requireRole("admin"), getAllAutomationsController);

export default router;