"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const form_controller_1 = __importDefault(require("./form.controller"));
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.get("/public/:key", form_controller_1.default.getPublicFormByKey);
router.post("/admin", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), form_controller_1.default.createForm);
router.get("/admin", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), form_controller_1.default.getAllForms);
router.get("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), form_controller_1.default.getFormById);
router.patch("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), form_controller_1.default.updateForm);
router.patch("/admin/:id/toggle", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), form_controller_1.default.toggleForm);
router.delete("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), form_controller_1.default.deleteForm);
exports.default = router;
