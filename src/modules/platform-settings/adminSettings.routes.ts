// src/modules/platform-settings/adminSettings.routes.ts
import { Router } from "express";
import { adminSettingsController } from "./adminSettings.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/", adminSettingsController.get);
router.put("/", adminSettingsController.update);
router.get("/health", adminSettingsController.health);
router.post("/test/:service", adminSettingsController.testConnection);   // ⭐ NEW

export default router;