// src/modules/entitlement/entitlement.interface.ts
import { Document, Types } from "mongoose";
import { ProductType } from "../product/product.interface";

export type EntitlementStatus = "active" | "expired" | "revoked";
export type EntitlementSource = "order" | "free" | "admin" | "affiliate_reward";

export interface IEntitlement extends Document {
  user: Types.ObjectId;
  product: Types.ObjectId;          // FK to Product
  productType: ProductType;         // denormalized
  refId: Types.ObjectId;            // denormalized (Course._id, etc.)
  teacher: Types.ObjectId;
  source: EntitlementSource;
  orderItemId?: Types.ObjectId;
  status: EntitlementStatus;
  grantedAt: Date;
  expiresAt?: Date | null;          // null = lifetime
  revokedAt?: Date | null;
  autoRenew?: boolean;
  providerSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}