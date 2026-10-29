// src/modules/product/product.interface.ts
import { Document, Types } from "mongoose";

export type ProductType =
  | "course"
  | "digital_file"
  | "coaching"
  | "platform_subscription"
  | "addon";

export type ProductStatus = "draft" | "published" | "archived";

export interface ICommissionPolicy {
  enabled: boolean;
  type: "one_time" | "recurring";
  valueType: "percent" | "flat";
  value: number;
  duration: "lifetime" | "fixed_months";
  durationMonths?: number;
}

export interface ISubscriptionTierSnapshot {
  tierId: string;
  interval: "weekly" | "monthly" | "yearly";
  price: number;
}

export interface IProduct extends Document {
  type: ProductType;
  refId: Types.ObjectId;
  teacherId: Types.ObjectId;
  title: string;
  slug: string;
  thumbnailUrl?: string;
  priceModel: "free" | "onetime" | "subscription";
  currency: string;
  oneTimePrice?: number;
  subscriptionTiers?: ISubscriptionTierSnapshot[];
  commissionPolicy: ICommissionPolicy;
  status: ProductStatus;
  publishedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}