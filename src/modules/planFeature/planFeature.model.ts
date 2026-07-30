import mongoose, { Schema } from "mongoose";
import { IPlanFeatureTemplate } from "./planFeature.interface";

const PlanFeatureSchema = new Schema<IPlanFeatureTemplate>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    label: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ["boolean", "number", "text"], required: true },
    defaultValue: { type: Schema.Types.Mixed, required: true },
    unit: { type: String, trim: true },
    icon: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

PlanFeatureSchema.pre("validate", function (next) {
  if (this.type === "boolean" && typeof this.defaultValue !== "boolean") {
    return next(new Error(`defaultValue must be boolean for type "boolean"`));
  }
  if (this.type === "number" && typeof this.defaultValue !== "number") {
    return next(new Error(`defaultValue must be number for type "number"`));
  }
  next();
});

const PlanFeatureModel = mongoose.model<IPlanFeatureTemplate>("PlanFeature", PlanFeatureSchema);
export default PlanFeatureModel;