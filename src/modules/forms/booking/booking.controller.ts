import { Request, Response, NextFunction } from "express";
import {
  createBooking,
  getAllBookings,
  getUserBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  deleteBooking,
} from "./booking.service";

export async function createBookingController(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await createBooking(req.body);
    return res.status(201).json({ success: true, message: "Booking created", data: booking });
  } catch (error) {
    next(error);
  }
}

export async function getAllBookingsController(req: Request, res: Response, next: NextFunction) {
  try {
    const bookings = await getAllBookings(req.query as Record<string, any>);
    return res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
}

export async function getUserBookingsController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user._id;
    const role = (req as any).user.role; // "teacher" or "student"
    const bookings = await getUserBookings(userId, role);
    return res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
}

export async function getBookingByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

export async function updateBookingStatusController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, meetingLink } = req.body;
    const booking = await updateBookingStatus(id, status, meetingLink);
    return res.status(200).json({ success: true, message: "Booking updated", data: booking });
  } catch (error) {
    next(error);
  }
}

export async function cancelBookingController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const booking = await cancelBooking(id);
    return res.status(200).json({ success: true, message: "Booking cancelled", data: booking });
  } catch (error) {
    next(error);
  }
}

export async function deleteBookingController(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await deleteBooking(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    return res.status(200).json({ success: true, message: "Booking deleted" });
  } catch (error) {
    next(error);
  }
}