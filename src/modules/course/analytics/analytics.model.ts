import { Schema, model } from "mongoose";
import { IAnalyticsEvent } from "./analytics.interface";

const eventSchema = new Schema<IAnalyticsEvent>({
  eventType: { type: String, required: true, index: true },
  course: { type: Schema.Types.ObjectId, ref: "Course", index: true },
  teacher: { type: Schema.Types.ObjectId, ref: "User", index: true },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

eventSchema.index({ teacher: 1, eventType: 1, createdAt: -1 });
eventSchema.index({ course: 1, eventType: 1, createdAt: -1 });
// TTL — auto-delete after 2 years
eventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

export default model<IAnalyticsEvent>("AnalyticsEvent", eventSchema);