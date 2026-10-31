// affiliate/dashboard.controller.ts
import { Request, Response, NextFunction } from "express";
import { affiliateDashboardService } from "./dashboard.service";

export const affiliateController = {
  async overview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await affiliateDashboardService.overview((req as any).user.sub);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async referrals(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await affiliateDashboardService.referrals((req as any).user.sub, {
        status: req.query.status as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ success: true, ...data });
    } catch (err) { next(err); }
  },
  async requestPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await affiliateDashboardService.requestPayout(
        (req as any).user.sub,
        {
          method: req.body.method,
          amount: req.body.amount,
          methodDetails: req.body.methodDetails || {},
        }
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
  async adminApprovePayout(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await affiliateDashboardService.adminApprovePayout(
        req.params.id, !!req.body.approved, req.body.reason
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async listPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await affiliateDashboardService.listPayouts(
        (req as any).user.sub,
        {
          status: req.query.status as string,
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.limit as string) || 20,
        }
      );
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  },

};