import { Document } from "mongoose";

export type PlanFeatureType = "boolean" | "number" | "text";

export interface IPlanFeatureTemplate extends Document {
  key: string;                  // unique, machine-readable, e.g. "ai_credits"
  label: string;                // human‑readable, e.g. "AI Credits / month"
  description?: string;
  type: PlanFeatureType;
  defaultValue: boolean | number | string;
  unit?: string;                // e.g. "credits", "students"
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}