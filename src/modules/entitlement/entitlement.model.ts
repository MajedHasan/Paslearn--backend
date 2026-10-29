// src/modules/entitlement/entitlement.model.ts
import { Schema, model } from "mongoose";
import { IEntitlement } from "./entitlement.interface";

const entitlementSchema = new Schema<IEntitlement>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productType: {
    type: String,
    enum: ["course", "digital_file", "coaching", "platform_subscription", "addon"],
    required: true,
  },
  refId: { type: Schema.Types.ObjectId, required: true },
  teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
  source: { type: String, enum: ["order", "free", "admin", "affiliate_reward"], required: true },
  orderItemId: { type: Schema.Types.ObjectId },
  status: { type: String, enum: ["active", "expired", "revoked"], default: "active" },
  grantedAt: { type: Date, default: () => new Date() },
  expiresAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  autoRenew: { type: Boolean, default: false },
  providerSubscriptionId: { type: String },
}, { timestamps: true });

// One active entitlement per (user, product)
entitlementSchema.index({ user: 1, product: 1 }, { unique: true });
entitlementSchema.index({ user: 1, productType: 1, status: 1 });
entitlementSchema.index({ refId: 1, status: 1 });
entitlementSchema.index({ expiresAt: 1 }, { sparse: true });

export default model<IEntitlement>("Entitlement", entitlementSchema);