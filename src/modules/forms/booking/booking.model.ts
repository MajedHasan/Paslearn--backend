import mongoose, { Schema } from "mongoose";
import { IBooking } from "./booking.interface";

const BookingSchema = new Schema<IBooking>(
  {
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
      index: true,
    },
    notes: String,
    meetingLink: String,
  },
  { timestamps: true, versionKey: false }
);

// Prevent double bookings for the same teacher at the same time
BookingSchema.index({ teacher: 1, date: 1, startTime: 1, endTime: 1 }, { unique: true });

export default mongoose.model<IBooking>("Booking", BookingSchema);