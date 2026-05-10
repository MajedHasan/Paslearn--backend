import mongoose, { Schema } from "mongoose";
import { IExperience } from "./experience.interface";

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

    componentKey: {
      type: String,
      required: true,
      trim: true,
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

      routes: [
        {
          type: String,
          trim: true,
        },
      ],

      excludeRoutes: [
        {
          type: String,
          trim: true,
        },
      ],
    },

    trigger: {
      type: {
        type: String,
        enum: ["always", "timer", "exit_intent", "scroll", "custom_event"],
        default: "always",
      },

      value: {
        type: Schema.Types.Mixed,
      },
    },

    schedule: {
      startAt: {
        type: Date,
      },

      endAt: {
        type: Date,
      },
    },

    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

ExperienceSchema.index({
  enabled: 1,
  type: 1,
  priority: -1,
});

ExperienceSchema.index({
  componentKey: 1,
});

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

const ExperienceModel = mongoose.model<IExperience>(
  "Experience",
  ExperienceSchema,
);

export default ExperienceModel;
