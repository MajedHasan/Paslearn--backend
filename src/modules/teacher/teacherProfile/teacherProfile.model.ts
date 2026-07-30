import mongoose, { Schema } from "mongoose";
import { ITeacherProfile } from "./teacherProfile.interface";

const TeacherProfileSchema = new Schema<ITeacherProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    domain: { type: String },
    academicCareer: { type: Schema.Types.Mixed },
    certificates: { type: Schema.Types.Mixed },
    reference: { type: String },
    recommendation: { type: String },
    recommendationImage: { type: String },
    customFields: { type: Schema.Types.Mixed },
    selectedPlan: { type: Schema.Types.ObjectId, ref: "Plan" },
    selectedTemplate: { type: Schema.Types.ObjectId, ref: "Theme" },
    photo: { type: String },
    status: {
      type: String,
      enum: ["pending_payment", "active", "inactive", "rejected"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model<ITeacherProfile>(
  "TeacherProfile",
  TeacherProfileSchema
);