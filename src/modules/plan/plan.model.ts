import mongoose, { Schema } from "mongoose";
import { IPlan, PlanAudience } from "./plan.interface";

const PlanFeatureSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ["boolean", "number", "text"], required: true },
    value: { type: Schema.Types.Mixed, required: true },
    tooltip: { type: String, trim: true },
    icon: { type: String, trim: true },
  },
  { _id: false }
);

const PriceSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD", uppercase: true, trim: true },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", "lifetime"],
      required: true,
    },
  },
  { _id: false }
);

const LimitsSchema = new Schema(
  {
    maxCourses: { type: Number, default: 0 },
    maxStudents: { type: Number, default: 0 },
    maxTemplates: { type: Number, default: 0 },
    maxLandingPages: { type: Number, default: 0 },
    maxForms: { type: Number, default: 0 },
    maxAutomations: { type: Number, default: 0 },
    maxSalesPages: { type: Number, default: 0 },
    maxFunnels: { type: Number, default: 0 },
    maxEmailCampaigns: { type: Number, default: 0 },
    maxDigitalProducts: { type: Number, default: 0 },
    maxCoachingClients: { type: Number, default: 0 },
    maxCourseEnrollments: { type: Number, default: 0 },
    certificateEnabled: { type: Boolean, default: false },
    jobBoardAccess: { type: Boolean, default: false },
    aiCredits: { type: Number, default: 0 },
  },
  { _id: false }
);

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, default: "" },

    icon: { type: String, trim: true },
    badge: { type: String, trim: true },
    ctaText: { type: String, trim: true },
    ctaUrl: { type: String, trim: true },

    price: { type: PriceSchema, required: true },

    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0, index: true },

    features: { type: [PlanFeatureSchema], default: [] },
    limits: { type: LimitsSchema, default: () => ({}) },

    applicableTo: {
      type: [String],
      enum: ["teacher", "student", "affiliate", "all"],
      default: ["teacher", "student"],
      validate: {
        validator: function (v: PlanAudience[]) {
          return v.length > 0;
        },
        message: "At least one target audience is required.",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

PlanSchema.index({ isActive: 1, sortOrder: 1 });

PlanSchema.pre("validate", function (next) {
  if (this.features && this.features.length > 0) {
    for (const feature of this.features) {
      if (feature.type === "boolean" && typeof feature.value !== "boolean") {
        return next(
          new Error(`Feature "${feature.key}" value must be a boolean`)
        );
      }
      if (feature.type === "number" && typeof feature.value !== "number") {
        return next(
          new Error(`Feature "${feature.key}" value must be a number`)
        );
      }
    }
  }
  next();
});

const PlanModel = mongoose.model<IPlan>("Plan", PlanSchema);
export default PlanModel;