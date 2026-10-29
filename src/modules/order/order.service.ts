import OrderModel from "./order.model";
import CartModel from "../cart/cart.model";
import ProductModel from "../product/product.model";
import CourseModel from "../course/course.model";
import { couponService } from "../coupon/coupon.service";
import { entitlementService } from "../entitlement/entitlement.service";
import { enrollmentService } from "../course/enrollment/enrollment.service";
import { affiliateService } from "../affiliate/affiliate.service";
import { cartService } from "../cart/cart.service";
import { AppError } from "../../utils/appError";
import { Types } from "mongoose";

const PLATFORM_FEE_PERCENT = 10; // 10% platform fee

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PLS-${y}${m}-${rand}`;
}

export const orderService = {
  async preview(userId: string) {
    const cart = await CartModel.findOne({ user: userId }).populate("items.product");
    if (!cart || !cart.items.length) throw new AppError("Cart is empty", 400);

    const subtotal = cart.items.reduce((a, i) => a + i.priceSnapshot, 0);
    let discountTotal = 0;
    let discountByProduct: Record<string, number> = {};
    let couponCode: string | null = null;

    if (cart.couponId) {
        const coupon = await couponService.findByIdOrFail(String(cart.couponId)).catch(() => null);
        if (coupon) {
        const result = await couponService.resolve({
            userId,
            code: coupon.code,
            currency: cart.currency,
            items: cart.items.map((i) => ({
            product: String(i.product),
            productType: i.productType as any,
            refId: String(i.refId),
            price: i.priceSnapshot,
            teacher: String(i.teacher),
            })),
            country: "US",
        });
        if (result.valid) {
            discountTotal = result.preview!.discountTotal;
            discountByProduct = result.preview!.discountByProduct;
            couponCode = result.preview!.coupon.code;
        }
        }
    }

    return {
        items: cart.items.map((i) => ({
        product: i.product,
        productType: i.productType,
        refId: i.refId,
        price: i.priceSnapshot,
        discount: discountByProduct[String(i.product)] || 0,
        finalPrice: Math.max(0, i.priceSnapshot - (discountByProduct[String(i.product)] || 0)),
        })),
        subtotal,
        discountTotal,
        taxTotal: 0,
        total: Math.max(0, subtotal - discountTotal),
        currency: cart.currency,
        couponCode,
    };
  },

  async createFromCart(userId: string, options: { affiliateCode?: string } = {}) {
    const cart = await CartModel.findOne({ user: userId });
    if (!cart || !cart.items.length) throw new AppError("Cart is empty", 400);

    const productIds = cart.items.map((i) => i.product);
    const products = await ProductModel.find({ _id: { $in: productIds }, status: "published", deletedAt: null });
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    for (const item of cart.items) {
        if (!productMap.has(String(item.product))) throw new AppError("Product no longer available", 400);
        if (item.productType === "course") {
        const course = await CourseModel.findById(item.refId);
        if (!course || course.status !== "published" || course.enrollmentsPaused) {
            throw new AppError("Course unavailable", 400);
        }
        if (course.enrollmentLimit > 0 && course.enrollmentCount >= course.enrollmentLimit) {
            throw new AppError("Course is full", 400);
        }
        }
        const owns = await entitlementService.check(userId, item.product);
        if (owns) throw new AppError("You already own one of the items", 400);
    }

    // ⭐ NEW — resolve by stored couponId
    let couponPreview: any = null;
    if (cart.couponId) {
        const coupon = await couponService.findByIdOrFail(String(cart.couponId)).catch(() => null);
        if (!coupon) throw new AppError("Coupon no longer exists", 400);

        const result = await couponService.resolve({
        userId, code: coupon.code, currency: cart.currency,
        items: cart.items.map((i) => ({
            product: String(i.product), productType: i.productType as any,
            refId: String(i.refId), price: i.priceSnapshot, teacher: String(i.teacher),
        })),
        country: "US",
        });
        if (!result.valid || String(result.preview!.coupon._id) !== String(cart.couponId)) {
        throw new AppError(result.reason || "Coupon no longer valid for this cart", 400);
        }
        couponPreview = result.preview!;
    }

    const subtotal = cart.items.reduce((a, i) => a + i.priceSnapshot, 0);
    const discountTotal = couponPreview?.discountTotal || 0;
    const total = Math.max(0, subtotal - discountTotal);

    // Build order items
    const orderItems = cart.items.map((i) => {
      const product: any = productMap.get(String(i.product));
      const discount = couponPreview?.discountByProduct[String(i.product)] || 0;
      const finalPrice = Math.max(0, i.priceSnapshot - discount);
      const platformFee = Math.round(finalPrice * PLATFORM_FEE_PERCENT) / 100;
      return {
        product: i.product,
        productType: i.productType,
        refId: i.refId,
        teacher: i.teacher,
        tierId: i.tierId,
        priceSnapshot: i.priceSnapshot,
        discountShare: discount,
        finalPrice,
        commissionSnapshot: product?.commissionPolicy,
        platformFee,
        teacherEarning: Math.max(0, finalPrice - platformFee),
        entitlementGranted: false,
      };
    });

    const order = await OrderModel.create({
      orderNumber: generateOrderNumber(),
      user: userId,
      currency: cart.currency,
      items: orderItems,
      subtotal,
      discountTotal,
      taxTotal: 0,
      total,
      coupon: couponPreview
        ? {
            couponId: couponPreview.coupon._id,
            code: couponPreview.coupon.code,
            type: couponPreview.coupon.type,
            value: couponPreview.coupon.value,
            appliedAmount: discountTotal,
          }
        : undefined,
      affiliateCode: options.affiliateCode,
      status: "pending",
    });

    // Reserve coupon (increments usedCount + creates redemption)
    if (couponPreview) {
      await couponService.reserve(
        couponPreview.coupon._id,
        userId,
        order._id,
        couponPreview
      );
    }

    // Free order shortcut: no payment needed
    if (total === 0) {
        await this.markPaid(String(order._id), { free: true });
        // Fire-and-forget invoice generation — see Part G analytics/invoice service
        import("../invoice/invoice.service").then((m) => m.invoiceService.generateForOrder(String(order._id))).catch(console.error);
    }

    return order;
  },

  /**
   * Called by payment webhook or free-order shortcut.
   * Idempotent — safe to retry.
   */
  async markPaid(orderId: string, opts: { free?: boolean; subscriptionId?: string } = {}) {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new AppError("Order not found", 404);
    if (order.status === "paid") return order; // idempotent

    order.status = "paid";
    order.paidAt = new Date();

    // Grant entitlements + create enrollments + counters
    for (const item of order.items) {
      if (item.entitlementGranted) continue;

      const ent = await entitlementService.grant({
        userId: order.user,
        productId: item.product,
        productType: item.productType,
        refId: item.refId,
        teacherId: item.teacher,
        source: opts.free ? "free" : "order",
        orderItemId: item._id,
        expiresAt: null, // lifetime — extend later via subscription
        providerSubscriptionId: opts.subscriptionId || item.subscriptionId,
        autoRenew: !!opts.subscriptionId,
      });

      if (item.productType === "course") {
        await enrollmentService.createFromEntitlement({
          userId: order.user,
          courseId: item.refId,
          teacherId: item.teacher,
          entitlementId: ent._id,
          productId: item.product,
          orderItemId: item._id,
          source: opts.free ? "free" : "purchase",
          expiresAt: null,
        });

        await CourseModel.updateOne(
          { _id: item.refId },
          { $inc: { revenueCents: Math.round(item.finalPrice * 100) } }
        );
      }

      // Platform subscription activation (stub — wire to plan service later)
      if (item.productType === "platform_subscription") {
        // TODO: activate teacher's plan: TeacherProfile.findByIdAndUpdate(...)
      }

      // Record affiliate commission
      if (order.affiliateCode && item.commissionSnapshot?.enabled) {
        await affiliateService.recordCommission({
          affiliateCode: order.affiliateCode,
          order: order._id,
          orderItemId: item._id,
          product: item.product,
          teacher: item.teacher,
          policy: item.commissionSnapshot,
          basePrice: item.finalPrice, // post-coupon price
          currency: order.currency,
        });
      }

      item.entitlementGranted = true;
    }

    await order.save();
    await couponService.commit(order._id);
    await cartService.clear(String(order.user));

    return order;
  },

  async markFailed(orderId: string) {
    const order = await OrderModel.findById(orderId);
    if (!order || order.status !== "pending") return null;
    order.status = "failed";
    await order.save();
    await couponService.reverse(order._id);
    return order;
  },

  async cancel(userId: string, orderId: string) {
    const order = await OrderModel.findOne({ _id: orderId, user: userId });
    if (!order) throw new AppError("Order not found", 404);
    if (order.status !== "pending") throw new AppError("Only pending orders can be cancelled", 400);
    order.status = "cancelled";
    await order.save();
    await couponService.reverse(order._id);
    return order;
  },

  async getMine(userId: string) {
    return OrderModel.find({ user: userId }).sort({ createdAt: -1 }).lean();
  },

  async getOne(userId: string, orderId: string) {
    const order = await OrderModel.findOne({ _id: orderId, user: userId }).lean();
    if (!order) throw new AppError("Order not found", 404);
    return order;
  },

  async refund(orderId: string, reason?: string) {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new AppError("Order not found", 404);
    if (order.status !== "paid") throw new AppError("Only paid orders can be refunded", 400);

    // Payment refund is handled by paymentService (caller responsibility) — this handles state
    order.status = "refunded";
    await order.save();

    // Revoke entitlements
    for (const item of order.items) {
      const ent = await entitlementService.checkByRef(order.user, item.productType, item.refId);
      if (ent) await entitlementService.revoke(String(ent._id), reason);
    }

    // Reverse coupon
    await couponService.reverse(order._id);

    // Reverse affiliate commissions
    await affiliateService.reverseForOrder(order._id);

    return order;
  },
};