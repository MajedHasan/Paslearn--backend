import { Schema, model } from "mongoose";
import { IOrder } from "./order.interface";

const commissionPolicySchema = new Schema({
  enabled: Boolean,
  type: { type: String, enum: ["one_time", "recurring"] },
  valueType: { type: String, enum: ["percent", "flat"] },
  value: Number,
  duration: { type: String, enum: ["lifetime", "fixed_months"] },
  durationMonths: Number,
}, { _id: false });

const orderItemSchema = new Schema<IOrder["items"][number]>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productType: {
    type: String,
    enum: ["course", "digital_file", "coaching", "platform_subscription", "addon"],
    required: true,
  },
  refId: { type: Schema.Types.ObjectId, required: true },
  teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
  tierId: String,
  priceSnapshot: { type: Number, required: true },
  discountShare: { type: Number, default: 0 },
  finalPrice: { type: Number, required: true },
  commissionSnapshot: commissionPolicySchema,
  platformFee: { type: Number, default: 0 },
  teacherEarning: { type: Number, default: 0 },
  entitlementGranted: { type: Boolean, default: false },
  subscriptionId: String,
});

const orderSchema = new Schema<IOrder>({
  orderNumber: { type: String, required: true, unique: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  currency: { type: String, default: "USD", uppercase: true },
  items: { type: [orderItemSchema], required: true },
  subtotal: { type: Number, required: true },
  discountTotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  total: { type: Number, required: true },
  coupon: {
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
    code: String,
    type: String,
    value: Number,
    appliedAmount: Number,
  },
  affiliateCode: String,
  status: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded", "partially_refunded", "cancelled"],
    default: "pending",
    index: true,
  },
  billingInfo: { type: Schema.Types.Mixed },
  paidAt: { type: Date, default: null },
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });

export default model<IOrder>("Order", orderSchema);