import { Router } from "express";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

import { 
createModulePresetController,
getAllModulePresetsController,
getModulePresetByIdController,
updateModulePresetController,
deleteModulePresetController
} from "./modulePreset.controller"

const router = Router();

// Admin routes
router.post("/", requireAuth, requireRole("admin"), createModulePresetController);
router.get("/", requireAuth, requireRole("admin"), getAllModulePresetsController);
router.get("/:id", requireAuth, requireRole("admin"), getModulePresetByIdController);
router.patch("/:id", requireAuth, requireRole("admin"), updateModulePresetController);
router.delete("/:id", requireAuth, requireRole("admin"), deleteModulePresetController);

// Public routes
router.get("/", getAllModulePresetsController);
router.get("/:id", getModulePresetByIdController);

export default router;