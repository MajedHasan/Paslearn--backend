import { Document, Types } from "mongoose";
import { ProductType } from "../product/product.interface";

export interface ICartItem {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  productType: ProductType;
  refId: Types.ObjectId;
  teacher: Types.ObjectId;
  priceSnapshot: number;
  tierId?: string;
  addedAt: Date;
}

export interface ICart extends Document {
  user: Types.ObjectId;
  currency: string;
  items: ICartItem[];
  couponId?: Types.ObjectId | null;   // ⬅️ was couponCode
  updatedAt: Date;
  createdAt: Date;
}