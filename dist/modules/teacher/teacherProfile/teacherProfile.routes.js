"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const teacherUpload_1 = require("./teacherUpload");
const teacherProfile_controller_1 = require("./teacherProfile.controller");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Use multer fields to accept multiple file types
const uploadFields = teacherUpload_1.teacherUpload.fields([
    { name: "photo", maxCount: 1 },
    { name: "recommendationImage", maxCount: 1 },
]);
// Teacher applies (POST /api/teacher/apply)
router.post("/apply", auth_middleware_1.requireAuth, uploadFields, teacherProfile_controller_1.createTeacherApplicationController);
// Get own profile
router.get("/", auth_middleware_1.requireAuth, teacherProfile_controller_1.getTeacherProfileController);
// Update profile
router.patch("/", auth_middleware_1.requireAuth, teacherProfile_controller_1.updateTeacherProfileController);
exports.default = router;
