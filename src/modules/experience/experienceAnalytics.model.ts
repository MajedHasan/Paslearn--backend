import mongoose, { Schema } from "mongoose";

export interface IExperienceImpression {
  experience: mongoose.Types.ObjectId;
  action: "view" | "click" | "close" | "convert";
  sessionId?: string;          // group actions from the same visitor
  device?: string;             // "mobile", "tablet", "desktop"
  referrer?: string;           // where the user came from
  metadata?: Record<string, any>; // free‑form extra data
  createdAt: Date;
}

const ImpressionSchema = new Schema<IExperienceImpression>(
  {
    experience: {
      type: Schema.Types.ObjectId,
      ref: "Experience",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["view", "click", "close", "convert"],
      required: true,
    },
    sessionId: { type: String, index: true },
    device: { type: String },
    referrer: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

// Compound index for analytics queries
ImpressionSchema.index({ experience: 1, action: 1, createdAt: 1 });

export const ExperienceImpressionModel = mongoose.model<IExperienceImpression>(
  "ExperienceImpression",
  ImpressionSchema
);