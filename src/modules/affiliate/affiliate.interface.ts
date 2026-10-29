import { Document, Types } from "mongoose";
import { ICommissionPolicy } from "../product/product.interface";

export interface IAffiliateProfile extends Document {
  user: Types.ObjectId;
  referralCode: string;
  status: "active" | "suspended";
  payoutMethod?: "stripe" | "paypal" | "manual";
  payoutDetails?: Record<string, any>;
  totalEarned: number;
  totalPending: number;
  totalPaid: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommission extends Document {
  affiliate: Types.ObjectId;
  affiliateCode: string;
  product: Types.ObjectId;
  order: Types.ObjectId;
  orderItem: Types.ObjectId;
  teacher: Types.ObjectId;
  type: "one_time" | "recurring";
  valueType: "percent" | "flat";
  value: number;
  amount: number;
  currency: string;
  periodStart?: Date;
  periodEnd?: Date | null;
  occurrenceNumber?: number;
  isFinal?: boolean;
  status: "pending" | "approved" | "paid" | "reversed";
  paidAt?: Date;
  createdAt: Date;
}