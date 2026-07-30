import mongoose, { Schema } from "mongoose";
import { IThemeCategory } from "./themeCategory.interface";

const ThemeCategorySchema = new Schema<IThemeCategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model<IThemeCategory>("ThemeCategory", ThemeCategorySchema);