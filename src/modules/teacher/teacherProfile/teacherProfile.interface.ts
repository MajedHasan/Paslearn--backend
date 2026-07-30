import { Document, Types } from "mongoose";

export interface ITeacherProfile extends Document {
  user: Types.ObjectId;
  // onboarding step data
  domain?: string;
  academicCareer?: Record<string, any>;
  certificates?: Record<string, any>;
  reference?: string;
  recommendation?: string;
  recommendationImage?: string;
  customFields?: Record<string, any>;
  selectedPlan?: Types.ObjectId;
  selectedTemplate?: Types.ObjectId;   // the theme
  photo?: string;                      // profile photo
  status: "pending_payment" | "active" | "inactive" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}