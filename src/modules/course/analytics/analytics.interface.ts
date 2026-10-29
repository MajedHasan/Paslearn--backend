import { Document, Types } from "mongoose";

export type AnalyticsEventType =
  | "course_view" | "cart_add" | "checkout_started" | "purchase"
  | "lesson_started" | "lesson_completed" | "quiz_submitted"
  | "review_created" | "certificate_issued";

export interface IAnalyticsEvent extends Document {
  eventType: AnalyticsEventType;
  course?: Types.ObjectId;
  teacher?: Types.ObjectId;
  user?: Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
}