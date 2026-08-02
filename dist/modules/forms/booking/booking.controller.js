"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBookingController = createBookingController;
exports.getAllBookingsController = getAllBookingsController;
exports.getUserBookingsController = getUserBookingsController;
exports.getBookingByIdController = getBookingByIdController;
exports.updateBookingStatusController = updateBookingStatusController;
exports.cancelBookingController = cancelBookingController;
exports.deleteBookingController = deleteBookingController;
const booking_service_1 = require("./booking.service");
async function createBookingController(req, res, next) {
    try {
        const booking = await (0, booking_service_1.createBooking)(req.body);
        return res.status(201).json({ success: true, message: "Booking created", data: booking });
    }
    catch (error) {
        next(error);
    }
}
async function getAllBookingsController(req, res, next) {
    try {
        const bookings = await (0, booking_service_1.getAllBookings)(req.query);
        return res.status(200).json({ success: true, data: bookings });
    }
    catch (error) {
        next(error);
    }
}
async function getUserBookingsController(req, res, next) {
    try {
        const userId = req.user._id;
        const role = req.user.role; // "teacher" or "student"
        const bookings = await (0, booking_service_1.getUserBookings)(userId, role);
        return res.status(200).json({ success: true, data: bookings });
    }
    catch (error) {
        next(error);
    }
}
async function getBookingByIdController(req, res, next) {
    try {
        const booking = await (0, booking_service_1.getBookingById)(req.params.id);
        if (!booking)
            return res.status(404).json({ success: false, message: "Booking not found" });
        return res.status(200).json({ success: true, data: booking });
    }
    catch (error) {
        next(error);
    }
}
async function updateBookingStatusController(req, res, next) {
    try {
        const { id } = req.params;
        const { status, meetingLink } = req.body;
        const booking = await (0, booking_service_1.updateBookingStatus)(id, status, meetingLink);
        return res.status(200).json({ success: true, message: "Booking updated", data: booking });
    }
    catch (error) {
        next(error);
    }
}
async function cancelBookingController(req, res, next) {
    try {
        const { id } = req.params;
        const booking = await (0, booking_service_1.cancelBooking)(id);
        return res.status(200).json({ success: true, message: "Booking cancelled", data: booking });
    }
    catch (error) {
        next(error);
    }
}
async function deleteBookingController(req, res, next) {
    try {
        const booking = await (0, booking_service_1.deleteBooking)(req.params.id);
        if (!booking)
            return res.status(404).json({ success: false, message: "Booking not found" });
        return res.status(200).json({ success: true, message: "Booking deleted" });
    }
    catch (error) {
        next(error);
    }
}
