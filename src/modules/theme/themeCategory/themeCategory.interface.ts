import { Document } from "mongoose";

export interface IThemeCategory extends Document {
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}