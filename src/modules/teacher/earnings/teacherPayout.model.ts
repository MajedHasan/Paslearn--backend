import { Schema, model, Document, Types } from "mongoose";

export type TeacherPayoutStatus = "requested" | "approved" | "paid" | "rejected";

export interface ITeacherPayout extends Document {
  teacher: Types.ObjectId;
  amount: number;
  method: "stripe" | "paypal" | "manual";
  methodDetails?: {
    paypalEmail?: string;
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    country?: string;
    swiftCode?: string;
    additionalNote?: string;
  };
  status: TeacherPayoutStatus;
  reason?: string;
  externalRef?: string;
  requestedBy: "teacher" | "auto";
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ITeacherPayout>({
  teacher: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ["stripe", "paypal", "manual"], required: true },
  methodDetails: { type: Schema.Types.Mixed, default: {} },
  status: {
    type: String,
    enum: ["requested", "approved", "paid", "rejected"],
    default: "requested",
    index: true,
  },
  reason: String,
  externalRef: String,
  requestedBy: { type: String, enum: ["teacher", "auto"], default: "teacher" },
  processedAt: { type: Date, default: null },
}, { timestamps: true });

export default model<ITeacherPayout>("TeacherPayout", schema);