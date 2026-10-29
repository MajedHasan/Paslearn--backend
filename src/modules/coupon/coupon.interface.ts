import { Document, Types } from "mongoose";

export type CouponType = "percentage" | "fixed" | "free_shipping" | "free" | "bogo";
export type CouponStatus = "active" | "scheduled" | "expired" | "disabled";
export type ApplicableItemType = "courses" | "digital" | "coaching";
export type SelectionMode = "all" | "selected" | "category";
export type UserTargetMode = "all" | "selected" | "group";

export interface IApplicableTo {
  items: ApplicableItemType[];
  mode: SelectionMode;
  selectedIds: string[];        // product/course IDs
  categories: string[];
}

export interface ITargetUsers {
  mode: UserTargetMode;
  userIds: string[];
  groupIds: string[];
}

export interface ICoupon extends Document {
  code: string;                 // uppercase, unique
  description?: string;
  type: CouponType;
  value: number;                // % or fixed amount
  minSpend?: number;
  maxDiscount?: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  usageLimit: number;           // 0 = unlimited
  usedCount: number;
  perUserLimit: number;         // 0 = unlimited
  appliesTo: IApplicableTo;
  targetUsers: ITargetUsers;
  countries: string[];          // ISO codes; empty = all
  campaign?: string;
  stackable: boolean;
  firstPurchaseOnly: boolean;
  excludeDiscountedItems: boolean;
  status: CouponStatus;
  ownerType: "admin" | "teacher";
  ownerId?: Types.ObjectId;     // teacher ID if ownerType=teacher
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export type RedemptionStatus = "reserved" | "committed" | "reversed";

export interface ICouponRedemptionItem {
  product: Types.ObjectId;
  productType: string;
  refId: Types.ObjectId;
  teacher: Types.ObjectId;         // NEW — for teacher-scoped queries
  productTitle: string;            // NEW — snapshot (survives product deletion)
  originalPrice: number;
  discountApplied: number;
}

export interface ICouponRedemption extends Document {
  coupon: Types.ObjectId;
  couponCode: string;              // NEW — snapshot (survives coupon delete/rename)
  user: Types.ObjectId;
  userEmail: string;               // NEW — snapshot (for invoice/receipt exports)
  order?: Types.ObjectId;
  orderNumber?: string;            // NEW — snapshot (survives order archival)
  discountAmount: number;
  currency: string;
  items: ICouponRedemptionItem[];
  status: RedemptionStatus;
  committedAt?: Date | null;       // NEW
  reversedAt?: Date | null;        // NEW
  createdAt: Date;
  updatedAt: Date;
}