import { Schema, model } from "mongoose";
import { ICoupon, ICouponRedemption } from "./coupon.interface";

const applicableToSchema = new Schema({
  items: { type: [String], enum: ["courses", "digital", "coaching"], default: [] },
  mode: { type: String, enum: ["all", "selected", "category"], default: "all" },
  selectedIds: { type: [String], default: [] },
  categories: { type: [String], default: [] },
}, { _id: false });

const targetUsersSchema = new Schema({
  mode: { type: String, enum: ["all", "selected", "group"], default: "all" },
  userIds: { type: [String], default: [] },
  groupIds: { type: [String], default: [] },
}, { _id: false });

const couponSchema = new Schema<ICoupon>({
  code: { type: String, required: true, uppercase: true, trim: true, index: true },
  description: { type: String },
  type: { type: String, enum: ["percentage", "fixed", "free_shipping", "free", "bogo"], required: true },
  value: { type: Number, required: true, min: 0 },
  minSpend: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number },
  currency: { type: String, default: "USD", uppercase: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  usageLimit: { type: Number, default: 0, min: 0 },
  usedCount: { type: Number, default: 0, min: 0 },
  perUserLimit: { type: Number, default: 1, min: 0 },
  appliesTo: { type: applicableToSchema, default: () => ({}) },
  targetUsers: { type: targetUsersSchema, default: () => ({}) },
  countries: { type: [String], default: [] },
  campaign: { type: String },
  stackable: { type: Boolean, default: false },
  firstPurchaseOnly: { type: Boolean, default: false },
  excludeDiscountedItems: { type: Boolean, default: false },
  status: { type: String, enum: ["active", "scheduled", "expired", "disabled"], default: "active", index: true },
  ownerType: { type: String, enum: ["admin", "teacher"], required: true, default: "admin" },
  ownerId: { type: Schema.Types.ObjectId, ref: "User", default: null }, // null for admin coupons
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true });

// Per-owner uniqueness — admin + each teacher can have their own GET10
couponSchema.index({ code: 1, ownerType: 1, ownerId: 1 }, { unique: true });
couponSchema.index({ status: 1, startDate: 1, endDate: 1 });
couponSchema.index({ ownerType: 1, ownerId: 1, createdAt: -1 });

const redemptionItemSchema = new Schema<ICouponRedemption["items"][number]>({
  product: { type: Schema.Types.ObjectId, ref: "Product" },
  productType: String,
  refId: { type: Schema.Types.ObjectId },
  teacher: { type: Schema.Types.ObjectId, ref: "User", index: true },
  productTitle: String,
  originalPrice: Number,
  discountApplied: Number,
}, { _id: false });

const redemptionSchema = new Schema<ICouponRedemption>({
  coupon: { type: Schema.Types.ObjectId, ref: "Coupon", required: true, index: true },
  couponCode: { type: String, required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  userEmail: { type: String, required: true },
  order: { type: Schema.Types.ObjectId, ref: "Order", index: true },
  orderNumber: { type: String, index: true },
  discountAmount: { type: Number, required: true },
  currency: { type: String, required: true },
  items: { type: [redemptionItemSchema], default: [] },
  status: { type: String, enum: ["reserved", "committed", "reversed"], default: "reserved", index: true },
  committedAt: { type: Date, default: null },
  reversedAt: { type: Date, default: null },
}, { timestamps: true });

redemptionSchema.index({ coupon: 1, user: 1, status: 1 });
redemptionSchema.index({ "items.teacher": 1, createdAt: -1 });
redemptionSchema.index({ coupon: 1, createdAt: -1 });

export const CouponModel = model<ICoupon>("Coupon", couponSchema);
export const CouponRedemptionModel = model<ICouponRedemption>("CouponRedemption", redemptionSchema);