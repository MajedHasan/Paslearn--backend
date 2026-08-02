"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const automation_controller_1 = require("./automation.controller");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const router = (0, express_1.Router)();
// Admin only
router.get("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), automation_controller_1.getAutomationByIdController);
router.patch("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), automation_controller_1.updateAutomationController);
router.patch("/:id/toggle", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), automation_controller_1.toggleAutomationController);
router.delete("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), automation_controller_1.deleteAutomationController);
router.post("/", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), automation_controller_1.createAutomationController);
router.get("/", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), automation_controller_1.getAllAutomationsController);
exports.default = router;
