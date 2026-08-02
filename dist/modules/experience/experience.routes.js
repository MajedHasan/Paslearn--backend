"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const experience_controller_1 = require("./experience.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
router.get("/public", experience_controller_1.getActiveExperiencesController);
/*
|--------------------------------------------------------------------------
| Admin Routes
|--------------------------------------------------------------------------
*/
router.post("/admin", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), experience_controller_1.createExperienceController);
router.get("/admin", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), experience_controller_1.getAllExperiencesController);
router.get("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), experience_controller_1.getExperienceByIdController);
router.get("/admin/:id/analytics", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), experience_controller_1.getExperienceAnalyticsController);
router.get("/admin/key/:key", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), experience_controller_1.getExperienceByKeyController);
router.patch("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), experience_controller_1.updateExperienceController);
router.patch("/admin/:id/toggle", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), experience_controller_1.toggleExperienceController);
router.delete("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), experience_controller_1.deleteExperienceController);
router.post("/public/impression", experience_controller_1.recordImpressionController);
exports.default = router;
