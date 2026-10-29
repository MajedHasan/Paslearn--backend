import { Schema, model } from "mongoose";
import { IAffiliateProfile, ICommission } from "./affiliate.interface";

const profileSchema = new Schema<IAffiliateProfile>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  referralCode: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ["active", "suspended"], default: "active" },
  payoutMethod: { type: String, enum: ["stripe", "paypal", "manual"] },
  payoutDetails: { type: Schema.Types.Mixed },
  totalEarned: { type: Number, default: 0 },
  totalPending: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
}, { timestamps: true });

const commissionSchema = new Schema<ICommission>({
  affiliate: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  affiliateCode: { type: String, required: true, index: true },
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  order: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  orderItem: { type: Schema.Types.ObjectId, required: true },
  teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["one_time", "recurring"], required: true },
  valueType: { type: String, enum: ["percent", "flat"], required: true },
  value: { type: Number, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  periodStart: Date,
  periodEnd: { type: Date, default: null },
  occurrenceNumber: { type: Number, default: 1 },
  isFinal: { type: Boolean, default: false },
  status: { type: String, enum: ["pending", "approved", "paid", "reversed"], default: "pending", index: true },
  paidAt: Date,
}, { timestamps: true });

export const AffiliateProfileModel = model<IAffiliateProfile>("AffiliateProfile", profileSchema);
export const CommissionModel = model<ICommission>("Commission", commissionSchema);