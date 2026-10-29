import { Schema, model } from "mongoose";
import { ICertificate } from "./certificate.interface";

const certificateSchema = new Schema<ICertificate>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
  certificateNumber: { type: String, required: true, unique: true, index: true },
  verificationSlug: { type: String, required: true, unique: true, index: true },
  issuedAt: { type: Date, default: () => new Date() },
  revokedAt: { type: Date, default: null },
  revokeReason: String,
  pdfKey: String,
  meta: { type: Schema.Types.Mixed },
}, { timestamps: true });

certificateSchema.index({ user: 1, course: 1 }, { unique: true });

export default model<ICertificate>("Certificate", certificateSchema);