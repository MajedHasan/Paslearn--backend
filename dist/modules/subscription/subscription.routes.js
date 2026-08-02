"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscription_controller_1 = require("./subscription.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const router = (0, express_1.Router)();
// Authenticated user routes
router.post("/", auth_middleware_1.requireAuth, subscription_controller_1.createSubscriptionController);
router.get("/my", auth_middleware_1.requireAuth, subscription_controller_1.getUserSubscriptionsController);
router.get("/active", auth_middleware_1.requireAuth, subscription_controller_1.getActiveSubscriptionController);
// Cancel (both user and admin)
router.patch("/:id/cancel", auth_middleware_1.requireAuth, subscription_controller_1.cancelSubscriptionController);
// Admin routes
router.get("/admin", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), subscription_controller_1.getAllSubscriptionsController);
router.get("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), subscription_controller_1.getSubscriptionByIdController);
router.patch("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), subscription_controller_1.updateSubscriptionController);
exports.default = router;
