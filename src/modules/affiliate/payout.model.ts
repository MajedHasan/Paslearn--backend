import { Schema, model, Document, Types } from "mongoose";
import { IPayout } from "./affiliate.interface";

// export interface IPayout extends Document {
//   affiliate: Types.ObjectId;
//   method: "stripe" | "paypal" | "manual";
//   amount: number;
//   status: "requested" | "approved" | "paid" | "rejected";
//   reason?: string;
//   externalRef?: string;
//   methodDetails?: IPayoutMethodDetails;
//   processedAt?: Date | null;
//   createdAt: Date;
//   updatedAt: Date;
// }

const payoutSchema = new Schema<IPayout>({
  affiliate: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  method: { type: String, enum: ["stripe", "paypal", "manual"], required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["requested", "approved", "paid", "rejected"], default: "requested", index: true },
  reason: String,
  externalRef: String,
  methodDetails: { type: Schema.Types.Mixed, default: {} },   // ⭐ NEW
  processedAt: { type: Date, default: null },
}, { timestamps: true });

export const PayoutModel = model<IPayout>("Payout", payoutSchema);