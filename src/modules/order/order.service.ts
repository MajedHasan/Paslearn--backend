// src/modules/order/order.service.ts
import OrderModel from "./order.model";
import CartModel from "../cart/cart.model";
import ProductModel from "../product/product.model";
import CourseModel from "../course/course.model";
import { couponService } from "../coupon/coupon.service";
import { entitlementService } from "../entitlement/entitlement.service";
import { enrollmentService } from "../course/enrollment/enrollment.service";
import { affiliateService } from "../affiliate/affiliate.service";
import { AppError } from "../../utils/appError";
import { paymentService } from "../payments/payment.service";
import config from "../../config";

const PLATFORM_FEE_PERCENT = config.platform.platformFeePercentage || 10;

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PLS-${y}${m}-${rand}`;
}

export const orderService = {
// src/modules/order/order.service.ts
// Replace ONLY `preview` and `createFromCart`. Everything else stays.

  async preview(userId: string, opts: { country?: string } = {}) {
    const cart = await CartModel.findOne({ user: userId }).populate("items.product");
    if (!cart || !cart.items.length) throw new AppError("Cart is empty", 400);

    const { default: UserModel } = await import("../../models/user.model");
    const user = await UserModel.findById(userId).select("email country").lean();
    const userEmail = (user as any)?.email;
    const userCountry = (user as any)?.country;
    const finalCountry = opts.country || userCountry;

    const { default: OrderModel } = await import("./order.model");
    const hasPriorPurchases = !!(await OrderModel.exists({
      user: userId,
      status: "paid",
    }));

    // ⭐ idOf handles both populated docs and raw ObjectIds
    const idOf = (v: any): string => {
      if (!v) return "";
      if (typeof v === "object" && v._id) return String(v._id);
      return String(v);
    };

    const productIds = (cart.items as any[]).map((i) => idOf(i.product)).filter(Boolean);
    const productDocs = productIds.length
      ? await ProductModel.find({ _id: { $in: productIds } }).select("refId teacherId").lean()
      : [];
    const productMap = new Map(productDocs.map((p: any) => [String(p._id), p]));

    const courseIds = (cart.items as any[])
      .map((i) => idOf(i.refId) || idOf((productMap.get(idOf(i.product)) as any)?.refId))
      .filter(Boolean);
    const courseDocs = courseIds.length
      ? await CourseModel.find({ _id: { $in: courseIds } }).select("category").lean()
      : [];
    const categoryMap = new Map(courseDocs.map((c: any) => [String(c._id), c.category]));

    const couponItems = (cart.items as any[]).map((i) => {
      const pid = idOf(i.product);
      const prodDoc: any = productMap.get(pid);
      const rid = idOf(i.refId) || idOf(prodDoc?.refId);
      const tid = idOf(i.teacher) || idOf(prodDoc?.teacherId);
      return {
        product: pid,
        productType: i.productType as any,
        refId: rid,
        price: Number(i.priceSnapshot) || 0,
        teacher: tid,
        category: i.productType === "course" ? categoryMap.get(rid) : undefined,
      };
    });

    const subtotal = (cart.items as any[]).reduce((a, i) => a + i.priceSnapshot, 0);
    let discountTotal = 0;
    let discountByProduct: Record<string, number> = {};
    let couponCode: string | null = null;

    if (cart.couponId) {
      const coupon = await couponService
        .findByIdOrFail(String(cart.couponId))
        .catch(() => null);
      if (coupon) {
        const result = await couponService.validateSingle(coupon, {
          userId,
          userEmail,
          items: couponItems,
          currency: cart.currency || "USD",
          country: finalCountry,
          hasPriorPurchases,
        });
        if (result.valid && result.preview) {
          discountTotal = result.preview.discountTotal;
          discountByProduct = result.preview.discountByProduct;
          couponCode = result.preview.coupon.code;
        } else {
          console.warn(
            `[order.preview] coupon ${coupon.code} rejected: ${result.reason}`
          );
        }
      }
    }

    return {
      items: (cart.items as any[]).map((i) => {
        const pid = idOf(i.product);
        const discount = discountByProduct[pid] || 0;
        return {
          product: i.product,
          productType: i.productType,
          refId: i.refId,
          price: i.priceSnapshot,
          discount,
          finalPrice: Math.max(0, i.priceSnapshot - discount),
        };
      }),
      subtotal,
      discountTotal,
      taxTotal: 0,
      total: Math.max(0, subtotal - discountTotal),
      currency: cart.currency || "USD",
      couponCode,
    };
  },

  async createFromCart(
    userId: string,
    options: { affiliateCode?: string; country?: string } = {}
  ) {
    const cart = await CartModel.findOne({ user: userId });
    if (!cart || !cart.items.length) throw new AppError("Cart is empty", 400);

    const existingPending = await OrderModel.findOne({
      user: userId,
      status: "pending",
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
    }).sort({ createdAt: -1 });

    if (existingPending) {
      const cartProductIds = new Set(
        (cart.items as any[]).map((i) => {
          const v: any = i.product;
          return typeof v === "object" && v?._id ? String(v._id) : String(v);
        })
      );
      const orderProductIds = new Set(
        existingPending.items.map((i: any) => String(i.product))
      );
      const itemsMatch =
        cartProductIds.size === orderProductIds.size &&
        [...cartProductIds].every((id) => orderProductIds.has(id));

      if (itemsMatch) return existingPending;

      try {
        existingPending.status = "cancelled";
        await existingPending.save();
        await couponService.reverse(String(existingPending._id));
      } catch (e: any) {
        console.error("[createFromCart] stale cancel failed:", e?.message);
      }
    }

    const idOf = (v: any): string => {
      if (!v) return "";
      if (typeof v === "object" && v._id) return String(v._id);
      return String(v);
    };

    const productIds = (cart.items as any[]).map((i) => idOf(i.product)).filter(Boolean);
    const products = await ProductModel.find({
      _id: { $in: productIds },
      status: "published",
      deletedAt: null,
    });
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    for (const item of cart.items as any[]) {
      if (!productMap.has(idOf(item.product))) {
        throw new AppError("Product no longer available", 400);
      }
      if (item.productType === "course") {
        const course = await CourseModel.findById(item.refId);
        if (!course || course.status !== "published" || course.enrollmentsPaused) {
          throw new AppError("Course unavailable", 400);
        }
        if (course.enrollmentLimit > 0 && course.enrollmentCount >= course.enrollmentLimit) {
          throw new AppError("Course is full", 400);
        }
      }
      const owns = await entitlementService.check(userId, idOf(item.product));
      if (owns) throw new AppError("You already own one of the items", 400);
    }

    const { default: UserModel } = await import("../../models/user.model");
    const user = await UserModel.findById(userId).select("email country").lean();
    const userEmail = (user as any)?.email;
    const userCountry = (user as any)?.country;
    const finalCountry = options.country || userCountry;

    const hasPriorPurchases = !!(await OrderModel.exists({
      user: userId,
      status: "paid",
    }));

    const courseIds = (cart.items as any[])
      .map((i) => idOf(i.refId))
      .filter(Boolean);
    const courseDocs = courseIds.length
      ? await CourseModel.find({ _id: { $in: courseIds } }).select("category").lean()
      : [];
    const categoryMap = new Map(courseDocs.map((c: any) => [String(c._id), c.category]));

    const couponItems = (cart.items as any[]).map((i: any) => {
      const pid = idOf(i.product);
      const prodDoc: any = productMap.get(pid);
      const rid = idOf(i.refId) || idOf(prodDoc?.refId);
      const tid = idOf(i.teacher) || idOf(prodDoc?.teacherId);
      return {
        product: pid,
        productType: i.productType as any,
        refId: rid,
        price: Number(i.priceSnapshot) || 0,
        teacher: tid,
        category: i.productType === "course" ? categoryMap.get(rid) : undefined,
      };
    });

    let couponPreview: any = null;
    if (cart.couponId) {
      const coupon = await couponService
        .findByIdOrFail(String(cart.couponId))
        .catch(() => null);
      if (!coupon) throw new AppError("Coupon no longer exists", 400);

      const result = await couponService.validateSingle(coupon, {
        userId,
        userEmail,
        items: couponItems,
        currency: cart.currency || "USD",
        country: finalCountry,
        hasPriorPurchases,
      });

      if (!result.valid || !result.preview) {
        throw new AppError(result.reason || "Coupon no longer valid for this cart", 400);
      }
      couponPreview = result.preview;
    }

    const subtotal = (cart.items as any[]).reduce((a, i) => a + i.priceSnapshot, 0);
    const discountTotal = couponPreview?.discountTotal || 0;
    const total = Math.max(0, subtotal - discountTotal);

    const orderItems = (cart.items as any[]).map((i) => {
      const pid = idOf(i.product);
      const product: any = productMap.get(pid);
      const discount = couponPreview?.discountByProduct[pid] || 0;
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
      currency: cart.currency || "USD",
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

    if (couponPreview) {
      await couponService.reserve(
        couponPreview.coupon._id,
        userId,
        order._id,
        couponPreview
      );
    }

    if (total === 0) {
      await this.markPaid(String(order._id), { free: true });
      import("../invoice/invoice.service")
        .then((m) => m.invoiceService.generateForOrder(String(order._id)))
        .catch(console.error);
    }

    return order;
  },

  async markPaid(orderId: string, opts: { free?: boolean; subscriptionId?: string } = {}) {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new AppError("Order not found", 404);
    if (order.status === "paid") return order;
    if (order.status !== "pending") {
      throw new AppError(`Cannot mark ${order.status} order as paid`, 400);
    }

    const flip = await OrderModel.updateOne(
      { _id: orderId, status: "pending" },
      { $set: { status: "paid", paidAt: new Date() } }
    );
    if (flip.modifiedCount === 0) return await OrderModel.findById(orderId);

    const freshOrder = await OrderModel.findById(orderId);
    if (!freshOrder) throw new AppError("Order lost after update", 500);

    for (const item of freshOrder.items) {
      if (item.entitlementGranted) continue;
      try {
        const ent = await entitlementService.grant({
          userId: freshOrder.user,
          productId: item.product,
          productType: item.productType,
          refId: item.refId,
          teacherId: item.teacher,
          source: opts.free ? "free" : "order",
          orderItemId: item._id,
          expiresAt: null,
          providerSubscriptionId: opts.subscriptionId || item.subscriptionId,
          autoRenew: !!opts.subscriptionId,
        });

        if (item.productType === "course") {
          await enrollmentService.createFromEntitlement({
            userId: freshOrder.user,
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

        if (item.productType === "platform_subscription") {
          // TODO: activate teacher's plan via planService
        }

        if (freshOrder.affiliateCode && item.commissionSnapshot?.enabled) {
          const commission = await affiliateService.recordCommission({
            affiliateCode: freshOrder.affiliateCode,
            order: freshOrder._id,
            orderItemId: item._id,
            product: item.product,
            teacher: item.teacher,
            policy: item.commissionSnapshot,
            basePrice: item.finalPrice,
            currency: freshOrder.currency,
          });

          if (commission && (commission as any).amount > 0) {
            const newTeacherEarning = Math.max(
              0,
              item.finalPrice - item.platformFee - (commission as any).amount
            );
            await OrderModel.updateOne(
              { _id: orderId, "items._id": item._id },
              { $set: { "items.$.teacherEarning": newTeacherEarning } }
            );
          }
        }

        await OrderModel.updateOne(
          { _id: orderId, "items._id": item._id },
          { $set: { "items.$.entitlementGranted": true } }
        );
      } catch (err: any) {
        console.error(`[markPaid] Grant failed for ${orderId} item ${item._id}:`, err?.message);
      }
    }

    try {
      await couponService.commit(orderId);
    } catch (e: any) {
      console.error("[markPaid] Coupon commit failed:", e?.message);
    }

    try {
      const { default: CartModel } = await import("../cart/cart.model");
      await CartModel.updateOne(
        { user: freshOrder.user },
        { $set: { items: [], couponId: null } }
      );
    } catch (e: any) {
      console.error("[markPaid] Cart clear failed:", e?.message);
    }

    return freshOrder;
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

    order.status = "refunded";
    await order.save();

    for (const item of order.items) {
      const ent = await entitlementService.checkByRef(order.user, item.productType, item.refId);
      if (ent) await entitlementService.revoke(String(ent._id), reason);
    }

    await couponService.reverse(order._id);
    await affiliateService.reverseForOrder(order._id);
    return order;
  },

  async verifyPayment(orderId: string) {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new AppError("Order not found", 404);

    if (order.status === "paid") return order;
    if (order.status === "failed" || order.status === "cancelled") return order;
    if (order.total === 0) return this.markPaid(orderId, { free: true });

    const payment = await paymentService.findByOrder(String(order._id));
    if (!payment) throw new AppError("No payment record found", 404);

    const { paymentProviders } = await import("../payments/factory");
    const adapter = paymentProviders.get(payment.provider);
    const status = await adapter.retrievePaymentStatus(payment.providerRef);

    console.log(`[verifyPayment] order=${orderId} provider=${payment.provider} status=${status}`);

    if (status === "succeeded") {
      await paymentService.markSucceeded(payment.providerRef);
      return this.markPaid(orderId);
    }
    if (status === "failed") {
      await paymentService.markFailed(payment.providerRef);
      await this.markFailed(orderId);
      return await OrderModel.findById(orderId);
    }
    return order;
  },
};