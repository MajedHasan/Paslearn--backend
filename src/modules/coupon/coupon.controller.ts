import { Request, Response, NextFunction } from "express";
import { CouponModel } from "./coupon.model";
import { couponService } from "./coupon.service";
import { AppError } from "../../utils/appError";

export const couponController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const filter: any = { deletedAt: null };
      if (user.role === "teacher") {
        filter.$or = [{ ownerType: "admin" }, { ownerId: user.sub }];
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.q as string;
      if (search) filter.code = { $regex: search, $options: "i" };

      const [data, total] = await Promise.all([
        CouponModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        CouponModel.countDocuments(filter),
      ]);
      res.json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const doc = await CouponModel.findOne({ _id: req.params.id, deletedAt: null }).lean();
      if (!doc) throw new AppError("Coupon not found", 404);
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!["admin", "teacher"].includes(user.role)) throw new AppError("Forbidden", 403);
      const payload = {
        ...req.body,
        ownerType: user.role === "admin" ? "admin" : "teacher",
        ownerId: user.role === "teacher" ? user.sub : undefined,
      };
      if (payload.startDate) payload.startDate = new Date(payload.startDate);
      if (payload.endDate) payload.endDate = new Date(payload.endDate);
      const doc = await CouponModel.create(payload);
      res.status(201).json({ success: true, data: doc });
    } catch (err: any) {
      if (err.code === 11000) return next(new AppError("Coupon code already exists", 409));
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const doc = await CouponModel.findOne({ _id: req.params.id, deletedAt: null });
      if (!doc) throw new AppError("Coupon not found", 404);
      if (user.role === "teacher" && String(doc.ownerId) !== user.sub) {
        throw new AppError("Forbidden", 403);
      }
      const payload = { ...req.body };
      delete payload.usedCount;
      delete payload.ownerType;
      delete payload.ownerId;
      if (payload.startDate) payload.startDate = new Date(payload.startDate);
      if (payload.endDate) payload.endDate = new Date(payload.endDate);
      Object.assign(doc, payload);
      await doc.save();
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const doc = await CouponModel.findByIdAndUpdate(
        req.params.id,
        { deletedAt: new Date(), status: "disabled" },
        { new: true }
      );
      if (!doc) throw new AppError("Coupon not found", 404);
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user; // optional — guest carts allowed
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
          discountTotal: result.preview!.discountTotal,
          discountByProduct: result.preview!.discountByProduct,
          subtotal: result.preview!.subtotal,
          finalSubtotal: result.preview!.finalSubtotal,
        },
      });
    } catch (err) {
      next(err);
    }
  },


  // ═══ Teacher view — their own redemptions ═══
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

  // ═══ Admin view — all redemptions ═══
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