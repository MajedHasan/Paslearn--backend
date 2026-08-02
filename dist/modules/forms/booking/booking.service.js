"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTeacherAvailable = isTeacherAvailable;
exports.createBooking = createBooking;
exports.getAllBookings = getAllBookings;
exports.getUserBookings = getUserBookings;
exports.getBookingById = getBookingById;
exports.updateBookingStatus = updateBookingStatus;
exports.cancelBooking = cancelBooking;
exports.deleteBooking = deleteBooking;
const booking_model_1 = __importDefault(require("./booking.model"));
const mongoose_1 = __importDefault(require("mongoose"));
function isValidObjectId(id) {
    return mongoose_1.default.Types.ObjectId.isValid(id);
}
// ── Teacher availability (can be stored in a separate model later) ──
async function isTeacherAvailable(teacherId, date, startTime, endTime) {
    const conflicting = await booking_model_1.default.findOne({
        teacher: teacherId,
        date,
        status: { $nin: ["cancelled"] },
        $or: [
            { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
        ],
    });
    return !conflicting;
}
// ── Create a booking ──
async function createBooking(payload) {
    // Check availability
    const available = await isTeacherAvailable(payload?.teacher, payload?.date, payload?.startTime, payload?.endTime);
    if (!available) {
        throw new Error("The selected time slot is not available");
    }
    return booking_model_1.default.create(payload);
}
// ── Get all bookings (admin) ──
async function getAllBookings(filter = {}) {
    return booking_model_1.default.find(filter)
        .populate("teacher", "name email")
        .populate("student", "name email")
        .populate("course", "title")
        .sort({ date: -1, startTime: 1 })
        .lean();
}
// ── Get bookings for a specific user (teacher or student) ──
async function getUserBookings(userId, role) {
    const query = role === "teacher" ? { teacher: userId } : { student: userId };
    return booking_model_1.default.find(query)
        .populate("teacher", "name email")
        .populate("student", "name email")
        .populate("course", "title")
        .sort({ date: -1, startTime: 1 })
        .lean();
}
// ── Get booking by ID ──
async function getBookingById(id) {
    if (!isValidObjectId(id))
        return null;
    return booking_model_1.default.findById(id)
        .populate("teacher", "name email")
        .populate("student", "name email")
        .populate("course", "title")
        .lean();
}
// ── Update booking status ──
async function updateBookingStatus(id, status, meetingLink) {
    const booking = await booking_model_1.default.findById(id);
    if (!booking)
        throw new Error("Booking not found");
    booking.status = status;
    if (meetingLink)
        booking.meetingLink = meetingLink;
    await booking.save();
    return booking.toObject();
}
// ── Cancel booking ──
async function cancelBooking(id) {
    const booking = await booking_model_1.default.findById(id);
    if (!booking)
        throw new Error("Booking not found");
    booking.status = "cancelled";
    await booking.save();
    return booking.toObject();
}
// ── Delete booking (admin only) ──
async function deleteBooking(id) {
    return booking_model_1.default.findByIdAndDelete(id).lean();
}
