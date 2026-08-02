"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const modulePreset_controller_1 = require("./modulePreset.controller");
const router = (0, express_1.Router)();
// Admin routes
router.post("/", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), modulePreset_controller_1.createModulePresetController);
router.get("/", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), modulePreset_controller_1.getAllModulePresetsController);
router.get("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), modulePreset_controller_1.getModulePresetByIdController);
router.patch("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), modulePreset_controller_1.updateModulePresetController);
router.delete("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), modulePreset_controller_1.deleteModulePresetController);
// Public routes
router.get("/", modulePreset_controller_1.getAllModulePresetsController);
router.get("/:id", modulePreset_controller_1.getModulePresetByIdController);
exports.default = router;
