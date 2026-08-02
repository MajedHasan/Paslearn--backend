"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = require("./booking.controller");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const router = (0, express_1.Router)();
// Authenticated user: view own bookings
router.get("/my", auth_middleware_1.requireAuth, booking_controller_1.getUserBookingsController);
// Admin: manage all bookings
router.get("/admin", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), booking_controller_1.getAllBookingsController);
router.get("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), booking_controller_1.getBookingByIdController);
router.patch("/admin/:id/status", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), booking_controller_1.updateBookingStatusController);
router.delete("/admin/:id", auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)("admin"), booking_controller_1.deleteBookingController);
// User: cancel a booking (own booking)
router.patch("/:id/cancel", auth_middleware_1.requireAuth, booking_controller_1.cancelBookingController);
// Student/Teacher: create a booking
router.post("/", auth_middleware_1.requireAuth, booking_controller_1.createBookingController);
exports.default = router;
