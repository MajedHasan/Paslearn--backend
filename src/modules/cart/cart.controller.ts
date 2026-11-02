// src/modules/cart/cart.controller.ts
import { Request, Response, NextFunction } from "express";
import CartModel from "./cart.model";
import ProductModel from "../product/product.model";
import CourseModel from "../course/course.model";
import { couponService } from "../coupon/coupon.service";
import { AppError } from "../../utils/appError";
import type { CartItemForCoupon } from "../coupon/coupon.service";

function detectCountry(req: Request, userCountry?: string): string | undefined {
  const raw =
    (req.headers["x-country"] as string) ||
    (req.headers["cf-ipcountry"] as string) ||
    (req.headers["x-vercel-ip-country"] as string) ||
    userCountry ||
    "";
  const code = String(raw).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
}

function idOf(v: any): string {
  if (!v) return "";
  if (typeof v === "object" && v._id) return String(v._id);
  return String(v);
}

async function buildCartItemsForCoupon(
  cartItems: any[]
): Promise<CartItemForCoupon[]> {
  const productIds = cartItems.map((i) => idOf(i.product)).filter(Boolean);
  const productDocs = productIds.length
    ? await ProductModel.find({ _id: { $in: productIds } }).lean()
    : [];
  const productMap = new Map(productDocs.map((p: any) => [String(p._id), p]));

  const courseIds = cartItems
    .map((i) => {
      const pid = idOf(i.product);
      return idOf(i.refId) || idOf((productMap.get(pid) as any)?.refId);
    })
    .filter(Boolean);
  const courseDocs = courseIds.length
    ? await CourseModel.find({ _id: { $in: courseIds } }).select("category").lean()
    : [];
  const categoryMap = new Map(courseDocs.map((c: any) => [String(c._id), c.category]));

  return cartItems.map((i): CartItemForCoupon => {
    const pid = idOf(i.product);
    const productDoc: any = productMap.get(pid);
    const refId = idOf(i.refId) || idOf(productDoc?.refId);
    const teacher = idOf(i.teacher) || idOf(productDoc?.teacherId);
    const category =
      i.productType === "course" ? categoryMap.get(refId) : undefined;
    return {
      product: pid,
      productType: i.productType as CartItemForCoupon["productType"],
      refId,
      price: Number(i.priceSnapshot) || 0,
      teacher,
      category,
    };
  });
}

async function buildCouponPreview(
  cart: any,
  userId: string,
  country?: string
): Promise<{
  coupon: {
    couponId: string;
    code: string;
    ownerType: string;
    discountTotal: number;
    discountByProduct: Record<string, number>;
  } | null;
  discountTotal: number;
  discountByProduct: Record<string, number>;
  subtotalAfterDiscount: number;
}> {
  const empty = {
    coupon: null,
    discountTotal: 0,
    discountByProduct: {},
    subtotalAfterDiscount: 0,
  };
  if (!cart?.couponId) return empty;

  const couponDoc = await couponService
    .findByIdOrFail(String(cart.couponId))
    .catch(() => null);
  if (!couponDoc) {
    cart.couponId = null;
    await cart.save();
    return empty;
  }

  const { default: UserModel } = await import("../../models/user.model");
  const user = await UserModel.findById(userId).select("email").lean();

  const { default: OrderModel } = await import("../order/order.model");
  const hasPriorPurchases = !!(await OrderModel.exists({
    user: userId,
    status: "paid",
  }));

  const items = await buildCartItemsForCoupon(cart.items as any[]);

  // console.log(`[cart.preview] resolving coupon ${couponDoc.code}`, {
  //   mode: couponDoc.appliesTo.mode,
  //   selectedIds: couponDoc.appliesTo.selectedIds,
  //   targetMode: couponDoc.targetUsers.mode,
  //   targetEmails: couponDoc.targetUsers.userEmails,
  //   userEmail: (user as any)?.email,
  //   countries: couponDoc.countries,
  //   country,
  //   cartItems: items,
  // });

  const result = await couponService.validateSingle(couponDoc, {
    userId,
    userEmail: (user as any)?.email,
    items,
    currency: cart.currency || "USD",
    country,
    hasPriorPurchases,
  });

  if (!result.valid || !result.preview) {
    console.warn(
      `[cart.preview] coupon ${couponDoc.code} rejected: ${result.reason}`
    );
    cart.couponId = null;
    await cart.save();
    return empty;
  }

  return {
    coupon: {
      couponId: String(couponDoc._id),
      code: couponDoc.code,
      ownerType: couponDoc.ownerType,
      discountTotal: result.preview.discountTotal,
      discountByProduct: result.preview.discountByProduct,
    },
    discountTotal: result.preview.discountTotal,
    discountByProduct: result.preview.discountByProduct,
    subtotalAfterDiscount: result.preview.finalSubtotal,
  };
}

export const cartController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const cart = await CartModel.findOne({ user: userId }).populate("items.product");

      if (!cart) {
        return res.json({
          success: true,
          data: {
            items: [],
            subtotal: 0,
            coupon: null,
            total: 0,
            currency: "USD",
          },
        });
      }

      // ⭐ fetch user country for fallback
      const { default: UserModel } = await import("../../models/user.model");
      const user = await UserModel.findById(userId).select("country").lean();
      const userCountry = (user as any)?.country;

      const items = (cart.items as any[]).map((i) => ({
        _id: String(i._id),
        product: i.product,
        productType: i.productType,
        priceSnapshot: i.priceSnapshot,
        tierId: i.tierId,
      }));

      const subtotal = items.reduce((a, i) => a + i.priceSnapshot, 0);
      const preview = await buildCouponPreview(cart, userId, detectCountry(req, userCountry));
      const total = Math.max(0, subtotal - preview.discountTotal);

      res.json({
        success: true,
        data: {
          items,
          subtotal,
          coupon: preview.coupon,
          total,
          currency: cart.currency || "USD",
          discountTotal: preview.discountTotal,
          discountByProduct: preview.discountByProduct,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async applyCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const { code } = req.body;
      if (!code || !String(code).trim()) {
        throw new AppError("Coupon code required", 400);
      }

      const cart = await CartModel.findOne({ user: userId });
      if (!cart || !cart.items.length) {
        throw new AppError("Cart is empty", 400);
      }

      const { default: UserModel } = await import("../../models/user.model");
      const user = await UserModel.findById(userId).select("email").lean();
      const userEmail = (user as any)?.email || undefined;
      const userCountry = (user as any)?.country || undefined;

      const { default: OrderModel } = await import("../order/order.model");
      const hasPriorPurchases = !!(await OrderModel.exists({
        user: userId,
        status: "paid",
      }));

      const items = await buildCartItemsForCoupon(cart.items as any[]);

      // console.log(`[cart.applyCoupon] START`, {
      //   code: String(code).toUpperCase().trim(),
      //   userId,
      //   userEmail,
      //   hasPriorPurchases,
      //   country: detectCountry(req, userCountry),
      //   items,
      // });

      const result = await couponService.resolve({
        userId,
        userEmail,
        code: String(code).toUpperCase().trim(),
        items,
        currency: cart.currency || "USD",
        country: detectCountry(req, userCountry),
        hasPriorPurchases,
      });

      // console.log(`[cart.applyCoupon] RESULT`, {
      //   valid: result.valid,
      //   reason: result.reason,
      //   couponCode: result.preview?.coupon?.code,
      //   discountTotal: result.preview?.discountTotal,
      // });

      if (!result.valid || !result.preview) {
        return res.status(400).json({
          success: false,
          message: result.reason || "Coupon is invalid or not applicable to your cart",
        });
      }

      cart.couponId = result.preview.coupon._id;
      await cart.save();

      res.json({
        success: true,
        data: {
          couponId: String(result.preview.coupon._id),
          code: result.preview.coupon.code,
          ownerType: result.preview.coupon.ownerType,
          discountTotal: result.preview.discountTotal,
          discountByProduct: result.preview.discountByProduct,
          subtotal: result.preview.subtotal,
          finalSubtotal: result.preview.finalSubtotal,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async removeCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const cart = await CartModel.findOne({ user: userId });
      if (cart) {
        cart.couponId = null;
        await cart.save();
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  // ⭐ Renamed back to `add` — matches `router.post("/items", cartController.add)`
  async add(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const { productId, tierId } = req.body;
      if (!productId) throw new AppError("productId required", 400);

      const product: any = await ProductModel.findById(productId).lean();
      if (!product || product.status !== "published" || product.deletedAt) {
        throw new AppError("Product not available", 400);
      }

      const priceSnapshot =
        tierId && product.subscriptionTiers?.length
          ? (product.subscriptionTiers.find((t: any) => t.tierId === tierId)?.price ??
            product.oneTimePrice ??
            0)
          : product.oneTimePrice ?? 0;

      let cart = await CartModel.findOne({ user: userId });
      if (!cart) cart = await CartModel.create({ user: userId, items: [] });

      const exists = (cart.items as any[]).find(
        (i) => idOf(i.product) === String(productId) && i.tierId === tierId
      );
      if (exists) {
        return res.json({ success: true, data: cart });
      }

      (cart.items as any[]).push({
        product: product._id,
        productType: product.type,
        refId: product.refId,
        teacher: product.teacherId,
        tierId,
        priceSnapshot,
      });
      await cart.save();
      res.status(201).json({ success: true, data: cart });
    } catch (err) {
      next(err);
    }
  },

  // ⭐ Renamed back to `remove` — matches `router.delete("/items/:itemId", cartController.remove)`
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const cart = await CartModel.findOne({ user: userId });
      if (!cart) return res.json({ success: true });

      cart.items = (cart.items as any[]).filter(
        (i) => String(i._id) !== String(req.params.itemId)
      );
      if (cart.items.length === 0) cart.couponId = null;
      await cart.save();
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
};