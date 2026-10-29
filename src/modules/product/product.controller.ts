import { Request, Response, NextFunction } from "express";
import ProductModel from "./product.model";
import { productService } from "./product.service";
import { AppError } from "../../utils/appError";

export const productController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const filter: any = { deletedAt: null };
      if (user.role === "teacher") filter.teacherId = user.sub;
      if (req.query.type) filter.type = req.query.type;
      if (req.query.status) filter.status = req.query.status;

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

      const [data, total] = await Promise.all([
        ProductModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        ProductModel.countDocuments(filter),
      ]);
      res.json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err) { next(err); }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const doc = await ProductModel.findOne({ _id: req.params.id, deletedAt: null }).lean();
      if (!doc) throw new AppError("Product not found", 404);
      res.json({ success: true, data: doc });
    } catch (err) { next(err); }
  },

  // Only admins can set commission policies platform-wide
  async updateCommission(req: Request, res: Response, next: NextFunction) {
    try {
      const { enabled, type, valueType, value, duration, durationMonths } = req.body;
      const doc = await ProductModel.findByIdAndUpdate(
        req.params.id,
        {
          commissionPolicy: {
            enabled: !!enabled, type, valueType, value,
            duration: duration || "lifetime",
            durationMonths: durationMonths ?? null,
          },
        },
        { new: true }
      );
      if (!doc) throw new AppError("Product not found", 404);
      res.json({ success: true, data: doc });
    } catch (err) { next(err); }
  },
};