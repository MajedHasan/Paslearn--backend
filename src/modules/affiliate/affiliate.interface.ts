import { Document, Types } from "mongoose";
import { ICommissionPolicy } from "../product/product.interface";

export interface IAffiliateProfile extends Document {
  user: Types.ObjectId;
  referralCode: string;
  status: "active" | "suspended";
  payoutMethod?: "stripe" | "paypal" | "manual";
  payoutDetails?: Record<string, any>;
  totalEarned: number;
  totalPending: number;       // in escrow
  totalAvailable: number;     // ⭐ NEW — withdrawable now
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
  holdUntil?: Date;              // ⭐ NEW — when it becomes approved
  periodStart?: Date;
  periodEnd?: Date | null;
  occurrenceNumber?: number;
  isFinal?: boolean;
  status: "pending" | "approved" | "paid" | "reversed";
  paidAt?: Date;
  createdAt: Date;
}

export interface IPayoutMethodDetails {
  // PayPal
  paypalEmail?: string;
  accountHolderName?: string;

  // Bank
  bankName?: string;
  accountNumber?: string;   // IBAN or account number
  country?: string;
  swiftCode?: string;
  additionalNote?: string;
}

export interface IPayout extends Document {
  affiliate: Types.ObjectId;
  method: "stripe" | "paypal" | "manual";
  amount: number;
  status: "requested" | "approved" | "paid" | "rejected";
  reason?: string;
  externalRef?: string;
  methodDetails?: IPayoutMethodDetails;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}