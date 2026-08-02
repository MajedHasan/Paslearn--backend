"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const planFeature_controller_1 = require("./planFeature.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const router = (0, express_1.Router)();
// All admin-only
router.post("/", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), planFeature_controller_1.createFeatureController);
router.get("/", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), planFeature_controller_1.getAllFeaturesController);
router.get("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), planFeature_controller_1.getFeatureByIdController);
router.patch("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), planFeature_controller_1.updateFeatureController);
router.delete("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), planFeature_controller_1.deleteFeatureController);
exports.default = router;
