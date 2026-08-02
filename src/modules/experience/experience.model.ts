import mongoose, { Schema } from "mongoose";
import { IExperience } from "./experience.interface";

// ── Content sub‑schema ──────────────────────────────────
const ContentSchema = new Schema(
  {
    resourceType: {
      type: String,
      enum: ["form", "page"],
      required: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
    },
    resourceKey: {
      type: String,
      trim: true,
    },
    titleOverride: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// ── Main Experience Schema ──────────────────────────────
const ExperienceSchema = new Schema<IExperience>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["full_page", "popup", "banner", "redirect"],
      required: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
    target: {
      scope: {
        type: String,
        enum: ["global", "routes"],
        required: true,
      },
      routes: [{ type: String, trim: true }],
      excludeRoutes: [{ type: String, trim: true }],
    },
    trigger: {
      type: {
        type: String,
        enum: ["always", "timer", "exit_intent", "scroll", "custom_event"],
        default: "always",
      },
      value: Schema.Types.Mixed,
    },
    schedule: {
      startAt: Date,
      endAt: Date,
    },
    content: {
      type: ContentSchema,
      default: undefined,
    },
    options: {
      type: Schema.Types.Mixed,
      default: {},
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Indexes ──────────────────────────────────────────────
ExperienceSchema.index({ enabled: 1, type: 1, priority: -1 });

// ── Pre‑save validation ─────────────────────────────────
ExperienceSchema.pre("save", function (next) {
  if (
    this.schedule?.startAt &&
    this.schedule?.endAt &&
    this.schedule.startAt > this.schedule.endAt
  ) {
    return next(new Error("schedule.startAt cannot be greater than endAt"));
  }
  next();
});

const ExperienceModel = mongoose.model<IExperience>("Experience", ExperienceSchema);
export default ExperienceModel;