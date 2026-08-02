"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const pageTemplate_controller_1 = require("./pageTemplate.controller");
const router = (0, express_1.Router)();
// Admin routes
router.post("/", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), pageTemplate_controller_1.createPageTemplateController);
router.get("/", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), pageTemplate_controller_1.getAllPageTemplatesController);
router.get("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), pageTemplate_controller_1.getPageTemplateByIdController);
router.patch("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), pageTemplate_controller_1.updatePageTemplateController);
router.delete("/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), pageTemplate_controller_1.deletePageTemplateController);
// Public routes
router.get("/", pageTemplate_controller_1.getAllPageTemplatesController);
router.get("/:id", pageTemplate_controller_1.getPageTemplateByIdController);
router.get("/slug/:slug", pageTemplate_controller_1.getPageTemplateBySlugController);
exports.default = router;
