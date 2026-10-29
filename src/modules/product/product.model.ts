// src/modules/product/product.model.ts
import { Schema, model } from "mongoose";
import { IProduct } from "./product.interface";

const commissionPolicySchema = new Schema({
  enabled: { type: Boolean, default: false },
  type: { type: String, enum: ["one_time", "recurring"], default: "one_time" },
  valueType: { type: String, enum: ["percent", "flat"], default: "percent" },
  value: { type: Number, default: 0, min: 0 },
  duration: { type: String, enum: ["lifetime", "fixed_months"], default: "lifetime" },
  durationMonths: { type: Number },
}, { _id: false });

const tierSnapshotSchema = new Schema({
  tierId: { type: String, required: true },
  interval: { type: String, enum: ["weekly", "monthly", "yearly"], required: true },
  price: { type: Number, required: true },
}, { _id: false });

const productSchema = new Schema<IProduct>({
  type: {
    type: String,
    enum: ["course", "digital_file", "coaching", "platform_subscription", "addon"],
    required: true,
  },
  refId: { type: Schema.Types.ObjectId, required: true },
  teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  thumbnailUrl: { type: String },
  priceModel: { type: String, enum: ["free", "onetime", "subscription"], required: true },
  currency: { type: String, default: "USD", uppercase: true },
  oneTimePrice: { type: Number },
  subscriptionTiers: { type: [tierSnapshotSchema], default: [] },
  commissionPolicy: { type: commissionPolicySchema, default: () => ({}) },
  status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
  publishedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true });

productSchema.index({ type: 1, refId: 1 }, { unique: true });
productSchema.index({ type: 1, status: 1, publishedAt: -1 });

export default model<IProduct>("Product", productSchema);