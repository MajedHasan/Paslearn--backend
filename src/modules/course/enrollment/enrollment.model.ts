// src/modules/enrollment/enrollment.model.ts
import { Schema, model } from "mongoose";
import { IEnrollment } from "./enrollment.interface";

const enrollmentSchema = new Schema<IEnrollment>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: Schema.Types.ObjectId, ref: "Product" },
  entitlement: { type: Schema.Types.ObjectId, ref: "Entitlement", required: true },
  source: {
    type: String,
    enum: ["purchase", "free", "admin_grant", "coupon_100"],
    required: true,
  },
  orderItemId: { type: Schema.Types.ObjectId },
  status: {
    type: String,
    enum: ["active", "expired", "revoked", "refunded"],
    default: "active",
  },
  enrolledAt: { type: Date, default: () => new Date() },
  expiresAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  progressPercent: { type: Number, default: 0 },
  lessonsCompleted: { type: Number, default: 0 },
  lastAccessedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1, status: 1 });
enrollmentSchema.index({ teacher: 1, createdAt: -1 });

export default model<IEnrollment>("Enrollment", enrollmentSchema);