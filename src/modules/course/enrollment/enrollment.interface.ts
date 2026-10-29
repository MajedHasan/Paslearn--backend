// src/modules/enrollment/enrollment.interface.ts
import { Document, Types } from "mongoose";

export type EnrollmentStatus = "active" | "expired" | "revoked" | "refunded";
export type EnrollmentSource = "purchase" | "free" | "admin_grant" | "coupon_100";

export interface IEnrollment extends Document {
  user: Types.ObjectId;
  course: Types.ObjectId;
  teacher: Types.ObjectId;
  product?: Types.ObjectId;
  entitlement: Types.ObjectId;
  source: EnrollmentSource;
  orderItemId?: Types.ObjectId;
  status: EnrollmentStatus;
  enrolledAt: Date;
  expiresAt?: Date | null;
  cancelledAt?: Date | null;
  progressPercent: number;
  lessonsCompleted: number;
  lastAccessedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}