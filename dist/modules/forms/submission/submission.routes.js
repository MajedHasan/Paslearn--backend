"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const submission_controller_1 = __importDefault(require("./submission.controller"));
const submissionUpload_1 = require("./submissionUpload");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const router = (0, express_1.Router)();
// Public submission endpoint – accepts multipart
router.post("/public/:key", submissionUpload_1.submissionUpload.any(), // any field name for file uploads
submission_controller_1.default.createPublicSubmission);
// Admin routes
router.get("/admin", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), submission_controller_1.default.getAll);
router.get("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), submission_controller_1.default.getById);
router.patch("/admin/:id/status", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), submission_controller_1.default.updateStatus);
exports.default = router;
