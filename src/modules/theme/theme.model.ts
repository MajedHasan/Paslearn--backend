import mongoose, { Schema } from "mongoose";
import { ITheme } from "./theme.interface";

const ColorsSchema = new Schema(
  {
    primary: { type: String, default: "#0177fb" },
    secondary: { type: String, default: "#0156c7" },
    accent: { type: String, default: "#f59e0b" },
    background: { type: String, default: "#ffffff" },
    text: { type: String, default: "#101828" },
    heading: { type: String, default: "#101828" },
  },
  { _id: false, strict: false }
);

const FontsSchema = new Schema(
  {
    heading: { type: String, default: "Inter" },
    body: { type: String, default: "Inter" },
  },
  { _id: false, strict: false }
);

const GlobalStylesSchema = new Schema(
  {
    colors: { type: ColorsSchema, default: () => ({}) },
    fonts: { type: FontsSchema, default: () => ({}) },
    borderRadius: { type: String, default: "0.5rem" },
    spacing: { type: String, default: "1rem" },
    customCSS: { type: String, default: "" },
  },
  { _id: false }
);

const ThemeSchema = new Schema<ITheme>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    category: { type: Schema.Types.ObjectId, ref: "ThemeCategory" },
    tags: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    globalStyles: { type: GlobalStylesSchema, default: () => ({}) },
    pages: [{ type: Schema.Types.ObjectId, ref: "PageTemplate" }],
    modules: [{ type: Schema.Types.ObjectId, ref: "ModulePreset" }],
    version: { type: String, default: "1.0.0" },
    author: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index for public queries
ThemeSchema.index({ isActive: 1, sortOrder: 1 });

export default mongoose.model<ITheme>("Theme", ThemeSchema);