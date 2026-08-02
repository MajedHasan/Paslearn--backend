import BookingModel from "./booking.model";
import { IBooking } from "./booking.interface";
import mongoose from "mongoose";

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// ── Teacher availability (can be stored in a separate model later) ──
export async function isTeacherAvailable(
  teacherId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const conflicting = await BookingModel.findOne({
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
export async function createBooking(
  payload: Partial<IBooking>
): Promise<IBooking> {
  // Check availability
  const available = await isTeacherAvailable(
    payload?.teacher as any,
    payload?.date as Date,
    payload?.startTime as string,
    payload?.endTime as string
  );
  if (!available) {
    throw new Error("The selected time slot is not available");
  }

  return BookingModel.create(payload);
}

// ── Get all bookings (admin) ──
export async function getAllBookings(filter: Record<string, any> = {}) {
  return BookingModel.find(filter)
    .populate("teacher", "name email")
    .populate("student", "name email")
    .populate("course", "title")
    .sort({ date: -1, startTime: 1 })
    .lean();
}

// ── Get bookings for a specific user (teacher or student) ──
export async function getUserBookings(userId: string, role: "teacher" | "student") {
  const query = role === "teacher" ? { teacher: userId } : { student: userId };
  return BookingModel.find(query)
    .populate("teacher", "name email")
    .populate("student", "name email")
    .populate("course", "title")
    .sort({ date: -1, startTime: 1 })
    .lean();
}

// ── Get booking by ID ──
export async function getBookingById(id: string) {
  if (!isValidObjectId(id)) return null;
  return BookingModel.findById(id)
    .populate("teacher", "name email")
    .populate("student", "name email")
    .populate("course", "title")
    .lean();
}

// ── Update booking status ──
export async function updateBookingStatus(
  id: string,
  status: IBooking["status"],
  meetingLink?: string
) {
  const booking = await BookingModel.findById(id);
  if (!booking) throw new Error("Booking not found");

  booking.status = status;
  if (meetingLink) booking.meetingLink = meetingLink;
  await booking.save();
  return booking.toObject();
}

// ── Cancel booking ──
export async function cancelBooking(id: string) {
  const booking = await BookingModel.findById(id);
  if (!booking) throw new Error("Booking not found");
  booking.status = "cancelled";
  await booking.save();
  return booking.toObject();
}

// ── Delete booking (admin only) ──
export async function deleteBooking(id: string) {
  return BookingModel.findByIdAndDelete(id).lean();
}