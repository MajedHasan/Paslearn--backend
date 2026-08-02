"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const plan_controller_1 = require("./plan.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Admin routes (must be first to avoid conflict with /:id)
|--------------------------------------------------------------------------
*/
router.post("/admin", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), plan_controller_1.createPlanController);
router.get("/admin", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), plan_controller_1.getAllPlansController);
router.get("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), plan_controller_1.getPlanByIdController);
router.patch("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), plan_controller_1.updatePlanController);
router.patch("/admin/:id/toggle", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), plan_controller_1.togglePlanActiveController);
router.delete("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), plan_controller_1.deletePlanController);
/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/
router.get("/", plan_controller_1.getActivePlansController);
router.get("/slug/:slug", plan_controller_1.getPlanBySlugController);
router.get("/:id", plan_controller_1.getPlanByIdController); // must be last
exports.default = router;
