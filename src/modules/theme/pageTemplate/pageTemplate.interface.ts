import { Document } from "mongoose";

export type PageType = "home" | "landing" | "sales" | "lead_magnet" | "thank_you" | "funnel_step" | "course" | "custom";

export interface IPageTemplate extends Document {
  name: string;
  type: PageType;
  content: Record<string, any>;   // page‑builder JSON
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}