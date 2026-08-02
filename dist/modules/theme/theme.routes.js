"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const theme_controller_1 = require("./theme.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const router = (0, express_1.Router)();
// Admin routes
router.post("/admin", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), theme_controller_1.createThemeController);
router.get("/admin", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), theme_controller_1.getAllThemesController);
router.get("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), theme_controller_1.getThemeByIdController);
router.patch("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), theme_controller_1.updateThemeController);
router.patch("/admin/:id/toggle", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), theme_controller_1.toggleThemeActiveController);
router.delete("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), theme_controller_1.deleteThemeController);
// Public routes
router.get("/", theme_controller_1.getActiveThemesController);
router.get("/slug/:slug", theme_controller_1.getThemeBySlugController);
router.get("/:id", theme_controller_1.getThemeByIdController);
exports.default = router;
