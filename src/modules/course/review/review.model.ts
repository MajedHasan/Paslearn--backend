import { Schema, model } from "mongoose";
import { IReview } from "./review.interface";

const reviewSchema = new Schema<IReview>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  teacher: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  enrollment: { type: Schema.Types.ObjectId, ref: "Enrollment", required: true },
  orderItemId: { type: Schema.Types.ObjectId },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: String,
  comment: String,
  isVerifiedPurchase: { type: Boolean, default: true },
  status: { type: String, enum: ["visible", "hidden", "flagged", "pending"], default: "visible", index: true },
  teacherReply: {
    text: String,
    repliedAt: Date,
    repliedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  helpfulCount: { type: Number, default: 0 },
  flaggedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

reviewSchema.index({ user: 1, course: 1 }, { unique: true });
reviewSchema.index({ course: 1, status: 1, createdAt: -1 });

export default model<IReview>("Review", reviewSchema);