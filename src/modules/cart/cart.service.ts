import CartModel from "./cart.model";
import ProductModel from "../product/product.model";
import CourseModel from "../course/course.model";
import { entitlementService } from "../entitlement/entitlement.service";
import { couponService } from "../coupon/coupon.service";
import { AppError } from "../../utils/appError";

async function getOrCreateCart(userId: string) {
  let cart = await CartModel.findOne({ user: userId });
  if (!cart) cart = await CartModel.create({ user: userId, items: [], currency: "USD" });
  return cart;
}

async function priceForProduct(product: any, tierId?: string): Promise<number> {
  if (product.priceModel === "free") return 0;
  if (product.priceModel === "onetime") return product.oneTimePrice || 0;
  if (product.priceModel === "subscription") {
    const tiers = product.subscriptionTiers || [];
    if (!tiers.length) throw new AppError("Subscription product has no tiers", 400);
    const tier = tierId ? tiers.find((t: any) => t.tierId === tierId) : tiers[0];
    if (!tier) throw new AppError("Invalid subscription tier", 400);
    return tier.price;
  }
  return 0;
}

function buildCouponItems(items: any[]) {
  return items.map((i) => ({
    product: String(i.product),
    productType: i.productType as any,
    refId: String(i.refId),
    price: i.priceSnapshot,
    teacher: String(i.teacher),    // ⬅️ required for coupon resolution
  }));
}

export const cartService = {
  async get(userId: string) {
    const cart = await getOrCreateCart(userId);
    // ⭐ Populate product details for display in cart / checkout
    await cart.populate("items.product", "title type priceModel currency oneTimePrice");
    const subtotal = cart.items.reduce((a, i) => a + i.priceSnapshot, 0);

    let couponPreview: any = null;
    if (cart.couponId) {
      try {
        const coupon = await couponService.findByIdOrFail(String(cart.couponId));
        const result = await couponService.resolve({
          userId, code: coupon.code, currency: cart.currency,
          items: buildCouponItems(cart.items), country: "US",
        });
        if (result.valid) {
          couponPreview = {
            couponId: result.preview!.coupon._id,
            code: result.preview!.coupon.code,
            discountTotal: result.preview!.discountTotal,
            discountByProduct: result.preview!.discountByProduct,
          };
        } else {
          cart.couponId = null;
          await cart.save();
        }
      } catch {
        cart.couponId = null;
        await cart.save();
      }
    }

    return {
      items: cart.items, subtotal,
      coupon: couponPreview,
      total: couponPreview ? Math.max(0, subtotal - couponPreview.discountTotal) : subtotal,
      currency: cart.currency,
    };
  },

  async addItem(userId: string, params: { productId: string; tierId?: string }) {
    const product = await ProductModel.findOne({
      _id: params.productId, status: "published", deletedAt: null,
    });
    if (!product) throw new AppError("Product not available", 404);

    const owns = await entitlementService.check(userId, product._id);
    if (owns) throw new AppError("You already own this product", 400);

    if (product.type === "course") {
      const course = await CourseModel.findById(product.refId);
      if (!course || course.status !== "published" || course.deletedAt) {
        throw new AppError("Course unavailable", 404);
      }
      if (course.enrollmentsPaused) throw new AppError("Enrollment paused", 400);
      if (course.enrollmentLimit > 0 && course.enrollmentCount >= course.enrollmentLimit) {
        throw new AppError("Course is full", 400);
      }
    }

    const cart = await getOrCreateCart(userId);
    if (cart.items.some((i) => String(i.product) === String(product._id))) {
      throw new AppError("Item already in cart", 400);
    }

    const price = await priceForProduct(product, params.tierId);
    cart.items.push({
      product: product._id as any,
      productType: product.type,
      refId: product.refId,
      teacher: product.teacherId,
      priceSnapshot: price,
      tierId: params.tierId,
      addedAt: new Date(),
    } as any);

    // Invalidate coupon if the new item breaks applicability — re-validate below
    if (cart.couponId) {
      const coupon = await couponService.findByIdOrFail(String(cart.couponId)).catch(() => null);
      if (coupon) {
        const still = await couponService.resolve({
          userId, code: coupon.code, currency: cart.currency,
          items: buildCouponItems(cart.items), country: "US",
        });
        if (!still.valid) cart.couponId = null;
      } else cart.couponId = null;
    }

    await cart.save();
    return this.get(userId);
  },

  async removeItem(userId: string, itemId: string) {
    const cart = await getOrCreateCart(userId);
    cart.items = cart.items.filter((i) => String(i._id) !== itemId) as any;
    if (cart.couponId) {
      const coupon = await couponService.findByIdOrFail(String(cart.couponId)).catch(() => null);
      if (coupon) {
        const still = await couponService.resolve({
          userId, code: coupon.code, currency: cart.currency,
          items: buildCouponItems(cart.items), country: "US",
        });
        if (!still.valid) cart.couponId = null;
      } else cart.couponId = null;
    }
    await cart.save();
    return this.get(userId);
  },

  /**
   * ⭐ NEW — resolves the best applicable coupon and stores its ID.
   * Handles per-teacher uniqueness automatically.
   */
  async applyCoupon(userId: string, code: string) {
    const cart = await getOrCreateCart(userId);
    if (!cart.items.length) throw new AppError("Cart is empty", 400);

    const result = await couponService.resolve({
      userId, code, currency: cart.currency,
      items: buildCouponItems(cart.items), country: "US",
    });
    if (!result.valid) throw new AppError(result.reason || "Invalid coupon", 400);

    cart.couponId = result.preview!.coupon._id as any;
    await cart.save();
    return this.get(userId);
  },

  async removeCoupon(userId: string) {
    const cart = await getOrCreateCart(userId);
    cart.couponId = null;
    await cart.save();
    return this.get(userId);
  },

  async clear(userId: string, session?: any) {
    return CartModel.updateOne(
      { user: userId },
      { $set: { items: [], couponId: null } },
      { session }
    );
  },
};