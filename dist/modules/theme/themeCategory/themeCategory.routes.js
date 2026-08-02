"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const themeCategory_controller_1 = require("./themeCategory.controller");
const router = (0, express_1.Router)();
router.post("/", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), themeCategory_controller_1.createThemeCategoryController);
router.get("/", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), themeCategory_controller_1.getAllThemeCategoriesController);
router.get("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), themeCategory_controller_1.getThemeCategoryByIdController);
router.patch("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), themeCategory_controller_1.updateThemeCategoryController);
router.delete("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), themeCategory_controller_1.deleteThemeCategoryController);
// Public routes
router.get("/", themeCategory_controller_1.getAllThemeCategoriesController);
router.get("/:id", themeCategory_controller_1.getThemeCategoryByIdController);
exports.default = router;
