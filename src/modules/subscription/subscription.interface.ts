import { Document, Types } from "mongoose";

export type SubscriptionStatus = "active" | "canceled" | "expired" | "trial" | "pending";

export interface ISubscription extends Document {
  user: Types.ObjectId;        // ref to User
  plan: Types.ObjectId;        // ref to Plan
  status: SubscriptionStatus;
  billingCycle: "monthly" | "yearly" | "lifetime";
  startDate: Date;
  endDate?: Date;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}