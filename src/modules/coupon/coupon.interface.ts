// src/modules/coupon/coupon.interface.ts
import { Document, Types } from "mongoose";

export type CouponType = "percentage" | "fixed" | "free_shipping" | "free" | "bogo";
export type CouponStatus = "active" | "scheduled" | "expired" | "disabled";

/**
 * ⭐ Item types a coupon can target.
 * TEACHER-owned coupons may only use: courses, digital, coaching
 * ADMIN-owned coupons may only use:   subscriptions, addons
 * This split is enforced in coupon.service.ts.
 */
export type ApplicableItemType =
  | "courses"
  | "digital"
  | "coaching"
  | "subscriptions"
  | "addons";

export type SelectionMode = "all" | "selected" | "category";
export type UserTargetMode = "all" | "selected" | "group";

export interface IApplicableTo {
  items: ApplicableItemType[];
  mode: SelectionMode;
  selectedIds: string[];
  categories: string[];
}

export interface ITargetUsers {
  mode: UserTargetMode;
  userIds: string[];
  groupIds: string[];
  userEmails: string[];
}

export interface ICoupon extends Document {
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  minSpend?: number;
  maxDiscount?: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  appliesTo: IApplicableTo;
  targetUsers: ITargetUsers;
  countries: string[];
  campaign?: string;
  stackable: boolean;
  firstPurchaseOnly: boolean;
  excludeDiscountedItems: boolean;
  status: CouponStatus;
  ownerType: "admin" | "teacher";
  ownerId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export type RedemptionStatus = "reserved" | "committed" | "reversed";

export interface ICouponRedemptionItem {
  product: Types.ObjectId;
  productType: string;
  refId: Types.ObjectId;
  teacher: Types.ObjectId;
  productTitle: string;
  originalPrice: number;
  discountApplied: number;
}

export interface ICouponRedemption extends Document {
  coupon: Types.ObjectId;
  couponCode: string;
  user: Types.ObjectId;
  userEmail: string;
  order?: Types.ObjectId;
  orderNumber?: string;
  discountAmount: number;
  currency: string;
  items: ICouponRedemptionItem[];
  status: RedemptionStatus;
  committedAt?: Date | null;
  reversedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}