import { Document, Types } from "mongoose";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface IAvailabilitySlot {
  dayOfWeek: number;          // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  startTime: string;          // "09:00"
  endTime: string;            // "17:00"
}

export interface IBooking extends Document {
  teacher: Types.ObjectId;    // ref to User (or TeacherProfile)
  student?: Types.ObjectId;   // ref to User (optional, for guest bookings)
  course?: Types.ObjectId;    // optional link to a Course
  date: Date;                 // the actual date of the booking
  startTime: string;          // "14:00"
  endTime: string;            // "15:00"
  status: BookingStatus;
  notes?: string;
  meetingLink?: string;       // for online sessions
  createdAt: Date;
  updatedAt: Date;
}