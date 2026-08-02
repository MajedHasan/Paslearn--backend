import { Router } from "express";
import {
  createBookingController,
  getAllBookingsController,
  getUserBookingsController,
  getBookingByIdController,
  updateBookingStatusController,
  cancelBookingController,
  deleteBookingController,
} from "./booking.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();

// Authenticated user: view own bookings
router.get("/my", requireAuth, getUserBookingsController);

// Admin: manage all bookings
router.get("/admin", requireAuth, requireRole("admin"), getAllBookingsController);
router.get("/admin/:id", requireAuth, requireRole("admin"), getBookingByIdController);
router.patch("/admin/:id/status", requireAuth, requireRole("admin"), updateBookingStatusController);
router.delete("/admin/:id", requireAuth, requireRole("admin"), deleteBookingController);

// User: cancel a booking (own booking)
router.patch("/:id/cancel", requireAuth, cancelBookingController);

// Student/Teacher: create a booking
router.post("/", requireAuth, createBookingController);

export default router;