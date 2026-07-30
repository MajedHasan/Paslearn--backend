import mongoose, { Schema } from "mongoose";
import { IPageTemplate } from "./pageTemplate.interface";

const PageTemplateSchema = new Schema<IPageTemplate>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["home","landing","sales","lead_magnet","thank_you","funnel_step","course","custom"], required: true },
    content: { type: Schema.Types.Mixed, default: {} },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model<IPageTemplate>("PageTemplate", PageTemplateSchema);