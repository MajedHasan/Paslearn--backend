import { Document } from "mongoose";

export type ModuleType = "form" | "automation" | "tracking" | "other";

export interface IModulePreset extends Document {
  type: ModuleType;
  key: string;
  label: string;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}