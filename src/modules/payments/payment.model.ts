import { Schema, model, Document, Types } from "mongoose";

export type PaymentProviderName = "stripe" | "paypal";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded";

export interface IPayment extends Document {
  order: Types.ObjectId;
  provider: PaymentProviderName;
  providerRef: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  refundedAmount: number;
  method?: string;
  rawPayload?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  order: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  provider: { type: String, enum: ["stripe", "paypal"], required: true },
  providerRef: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { type: String, enum: ["pending", "succeeded", "failed", "refunded", "partially_refunded"], default: "pending", index: true },
  refundedAmount: { type: Number, default: 0 },
  method: String,
  rawPayload: { type: Schema.Types.Mixed },
}, { timestamps: true });

paymentSchema.index({ provider: 1, providerRef: 1 }, { unique: true });

export default model<IPayment>("Payment", paymentSchema);