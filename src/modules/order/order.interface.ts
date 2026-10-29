import { Document, Types } from "mongoose";
import { ProductType, ICommissionPolicy } from "../product/product.interface";

export type OrderStatus =
  | "pending" | "paid" | "failed"
  | "refunded" | "partially_refunded" | "cancelled";

export interface IOrderItem {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  productType: ProductType;
  refId: Types.ObjectId;
  teacher: Types.ObjectId;
  tierId?: string;
  priceSnapshot: number;
  discountShare: number;
  finalPrice: number;
  commissionSnapshot?: ICommissionPolicy;
  platformFee: number;
  teacherEarning: number;
  entitlementGranted: boolean;
  subscriptionId?: string;
}

export interface IOrderCoupon {
  couponId: Types.ObjectId;
  code: string;
  type: string;
  value: number;
  appliedAmount: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  user: Types.ObjectId;
  currency: string;
  items: IOrderItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  coupon?: IOrderCoupon;
  affiliateCode?: string;
  status: OrderStatus;
  billingInfo?: Record<string, any>;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}