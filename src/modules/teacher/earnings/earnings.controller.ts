import { Request, Response, NextFunction } from "express";
import { teacherEarningsService } from "./earnings.service";

export const teacherEarningsController = {
  async transactions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await teacherEarningsService.transactions(
        (req as any).user.sub,
        {
          from: req.query.from as string,
          to: req.query.to as string,
          productId: req.query.productId as string,
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.limit as string) || 20,
        }
      );
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  },

  async perProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await teacherEarningsService.perProduct(
        (req as any).user.sub,
        {
          from: req.query.from as string,
          to: req.query.to as string,
        }
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await teacherEarningsService.listProductsWithCommission(
        (req as any).user.sub
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateCommission(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await teacherEarningsService.updateCommission(
        (req as any).user.sub,
        req.params.productId,
        req.body
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};