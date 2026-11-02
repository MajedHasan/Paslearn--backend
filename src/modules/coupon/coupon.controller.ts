// src/modules/coupon/coupon.controller.ts
import { Request, Response, NextFunction } from "express";
import { CouponModel } from "./coupon.model";
import { couponService, assertItemTypesForOwner } from "./coupon.service";
import { AppError } from "../../utils/appError";
import mongoose from "mongoose";

function requireSub(req: Request): string {
  const user = (req as any).user;
  if (!user?.sub) throw new AppError("Authentication error: missing user ID", 401);
  return String(user.sub);
}

function isValidId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

export const couponController = {
  /**
   * Role-aware list:
   *   Teacher → only their own (ownerType="teacher", ownerId=self)
   *   Admin   → only platform coupons (ownerType="admin")
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const filter: any = { deletedAt: null };

      if (user.role === "teacher") {
        filter.ownerType = "teacher";
        filter.ownerId = requireSub(req);
      } else if (user.role === "admin") {
        filter.ownerType = "admin";
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(500, parseInt(req.query.limit as string) || 20);
      const search = req.query.q as string;
      if (search) filter.code = { $regex: search, $options: "i" };

      const [data, total] = await Promise.all([
        CouponModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        CouponModel.countDocuments(filter),
      ]);
      res.json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err) { next(err); }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const doc = await CouponModel.findOne({ _id: req.params.id, deletedAt: null }).lean();
      if (!doc) throw new AppError("Coupon not found", 404);

      // Teacher can only see their own
      if (
        user.role === "teacher" &&
        (doc.ownerType !== "teacher" || String(doc.ownerId) !== String(user.sub))
      ) {
        throw new AppError("Forbidden", 403);
      }

      res.json({ success: true, data: doc });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!["admin", "teacher"].includes(user.role)) throw new AppError("Forbidden", 403);

      const ownerType: "admin" | "teacher" = user.role === "admin" ? "admin" : "teacher";
      const ownerId = ownerType === "teacher" ? requireSub(req) : undefined;

      const payload = {
        ...req.body,
        ownerType,
        ownerId,
      };
      if (payload.startDate) payload.startDate = new Date(payload.startDate);
      if (payload.endDate) payload.endDate = new Date(payload.endDate);

      const doc = await couponService.createForOwner(payload, ownerType, ownerId);

      // console.log(`[coupon.create] ✓ ${doc._id} code=${doc.code} ownerType=${doc.ownerType} ownerId=${doc.ownerId}`);
      res.status(201).json({ success: true, data: doc });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!isValidId(req.params.id)) throw new AppError("Invalid coupon ID", 400);

      const ownerType: "admin" | "teacher" = user.role === "admin" ? "admin" : "teacher";
      const ownerId = ownerType === "teacher" ? requireSub(req) : undefined;

      const doc = await couponService.updateForOwner(req.params.id, req.body, ownerType, ownerId);

      // console.log(`[coupon.update] ✓ ${doc._id} updated by ${user.sub}`);
      res.json({ success: true, data: doc });
    } catch (err: any) {
      if (err.code === 11000) {
        return next(new AppError("You already have a coupon with this code", 409));
      }
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!isValidId(req.params.id)) throw new AppError("Invalid coupon ID", 400);

      const doc = await CouponModel.findOne({ _id: req.params.id, deletedAt: null });
      if (!doc) throw new AppError("Coupon not found", 404);

      const isAdmin = user.role === "admin";
      const ownerIdStr = doc.ownerId ? String(doc.ownerId) : "";
      const userIdStr = user.sub ? String(user.sub) : "";
      const isOwner = ownerIdStr !== "" && ownerIdStr === userIdStr;

      if (!isAdmin && !isOwner) {
        throw new AppError("You can only delete your own coupons", 403);
      }

      const deleted = await couponService.softDelete(req.params.id);
      // console.log(`[coupon.remove] ✓ ${doc._id} deleted by ${userIdStr}`);
      res.json({ success: true, data: deleted });
    } catch (err) { next(err); }
  },

  /**
   * Public endpoint — resolves the best candidate for a code + cart.
   * Used by `/api/coupons/validate` and `/api/cart/apply-coupon`.
   */
  async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { code, items, currency, country } = req.body;
      if (!code || !Array.isArray(items)) {
        throw new AppError("code and items required", 400);
      }

      let hasPriorPurchases = false;
      if (user?.sub) {
        const { default: OrderModel } = await import("../order/order.model");
        hasPriorPurchases = !!(await OrderModel.exists({ user: user.sub, status: "paid" }));
      }

      const result = await couponService.resolve({
        userId: user?.sub,
        userEmail: user?.email,
        code,
        items,
        currency: currency || "USD",
        country,
        hasPriorPurchases,
      });

      if (!result.valid) {
        return res.status(400).json({ success: false, message: result.reason });
      }

      res.json({
        success: true,
        data: {
          couponCode: result.preview!.coupon.code,
          couponId: String(result.preview!.coupon._id),
          ownerType: result.preview!.coupon.ownerType,
          discountTotal: result.preview!.discountTotal,
          discountByProduct: result.preview!.discountByProduct,
          subtotal: result.preview!.subtotal,
          finalSubtotal: result.preview!.finalSubtotal,
        },
      });
    } catch (err) { next(err); }
  },

  // ═══ Teacher-view redemptions ═══
  async teacherRedemptions(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const result = await couponService.listRedemptions({
        scope: "teacher",
        teacherId: user.sub,
        couponId: req.query.couponId as string,
        status: req.query.status as any,
        courseId: req.query.courseId as string,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        search: req.query.q as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async teacherRedemptionStats(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const data = await couponService.redemptionStats({
        scope: "teacher",
        teacherId: user.sub,
        couponId: req.query.couponId as string,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ═══ Admin-view redemptions ═══
  async adminRedemptions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await couponService.listRedemptions({
        scope: "admin",
        couponId: req.query.couponId as string,
        status: req.query.status as any,
        courseId: req.query.courseId as string,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        search: req.query.q as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async adminRedemptionStats(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await couponService.redemptionStats({
        scope: "admin",
        couponId: req.query.couponId as string,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};