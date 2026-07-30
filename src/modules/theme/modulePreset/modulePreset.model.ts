import mongoose, { Schema } from "mongoose";
import { IModulePreset } from "./modulePreset.interface";

const ModulePresetSchema = new Schema<IModulePreset>(
  {
    type: {
      type: String,
      enum: ["form", "automation", "tracking", "other"],
      required: true,
    },
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model<IModulePreset>("ModulePreset", ModulePresetSchema);