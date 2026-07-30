import mongoose, { Schema } from "mongoose";
import { ISubscription } from "./subscription.interface";

const SubscriptionSchema = new Schema<ISubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    status: {
      type: String,
      enum: ["active", "canceled", "expired", "trial", "pending"],
      default: "active",
      index: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", "lifetime"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    autoRenew: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

// Optional: a user can only have one active subscription at a time
// SubscriptionSchema.index({ user: 1, status: 1 }, { unique: true, partialFilterExpression: { status: "active" } });

const SubscriptionModel = mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
export default SubscriptionModel;