// src/modules/order/adminOrder.controller.ts
import { Request, Response, NextFunction } from "express";
import OrderModel from "./order.model";
import PaymentModel from "../payments/payment.model";
import UserModel from "../../models/user.model";
import { AppError } from "../../utils/appError";

export const adminOrderController = {
  /**
   * GET /api/admin/orders/counts
   * Tab counts + total revenue from paid orders.
   */
  async counts(_req: Request, res: Response, next: NextFunction) {
    try {
      const [statusAgg, revenueAgg] = await Promise.all([
        OrderModel.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        OrderModel.aggregate([
          { $match: { status: "paid" } },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]),
      ]);

      const counts: Record<string, number> = {
        all: 0, paid: 0, pending: 0, failed: 0, refunded: 0, cancelled: 0,
      };
      for (const r of statusAgg) {
        counts.all += r.count;
        if (r._id === "partially_refunded") {
          counts.refunded += r.count;
        } else if (counts[r._id] !== undefined) {
          counts[r._id] += r.count;
        } else {
          counts[r._id] = r.count;
        }
      }

      res.json({
        success: true,
        data: {
          ...counts,
          totalRevenue: Math.round((revenueAgg[0]?.total || 0) * 100) / 100,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/admin/orders
   * Paginated list with filters: status, search (order # / buyer email / name).
   */
  async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const skip = (page - 1) * limit;
      const status = String(req.query.status || "").trim();
      const search = String(req.query.search || "").trim();

      const filter: any = {};

      if (status && status !== "all") {
        if (status === "refunded") {
          filter.status = { $in: ["refunded", "partially_refunded"] };
        } else {
          filter.status = status;
        }
      }

      if (search) {
        const users = await UserModel.find({
          $or: [
            { email: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
          ],
        })
          .select("_id")
          .limit(200)
          .lean();

        const userIds = users.map((u: any) => u._id);

        filter.$or = [
          { orderNumber: { $regex: search, $options: "i" } },
          ...(userIds.length ? [{ user: { $in: userIds } }] : []),
        ];
      }

      const [data, total] = await Promise.all([
        OrderModel.find(filter)
          .populate("user", "name email profileImageUrl")
          .populate("items.product", "title type thumbnailUrl priceModel currency")
          .populate("items.teacher", "name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        OrderModel.countDocuments(filter),
      ]);

      // Batch-attach payment info
      const orderIds = data.map((o: any) => o._id);
      const payments = orderIds.length
        ? await PaymentModel.find({ order: { $in: orderIds } }).lean()
        : [];
      const paymentMap = new Map(
        payments.map((p: any) => [String(p.order), p])
      );
      const enriched = data.map((o: any) => ({
        ...o,
        payment: paymentMap.get(String(o._id)) || null,
      }));

      res.json({
        success: true,
        data: enriched,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  },
};