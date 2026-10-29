// src/modules/cart/cart.model.ts
import { Schema, model } from "mongoose";
import { ICart } from "./cart.interface";

const cartItemSchema = new Schema<ICart["items"][number]>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productType: {
    type: String,
    enum: ["course", "digital_file", "coaching", "platform_subscription", "addon"],
    required: true,
  },
  refId: { type: Schema.Types.ObjectId, required: true },
  teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
  priceSnapshot: { type: Number, required: true },
  tierId: { type: String },
  addedAt: { type: Date, default: () => new Date() },
});

const cartSchema = new Schema<ICart>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  currency: { type: String, default: "USD", uppercase: true },
  items: { type: [cartItemSchema], default: [] },
  couponId: { type: Schema.Types.ObjectId, ref: "Coupon", default: null },
}, { timestamps: true });

export default model<ICart>("Cart", cartSchema);