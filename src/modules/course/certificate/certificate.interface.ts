import { Document, Types } from "mongoose";

export interface ICertificate extends Document {
  user: Types.ObjectId;
  course: Types.ObjectId;
  teacher: Types.ObjectId;
  certificateNumber: string;
  verificationSlug: string;
  issuedAt: Date;
  revokedAt?: Date | null;
  revokeReason?: string;
  pdfKey?: string;
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}