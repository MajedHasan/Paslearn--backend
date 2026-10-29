import { Request, Response, NextFunction } from "express";
import { analyticsService } from "./analytics.service";

export const analyticsController = {
  async course(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await analyticsService.courseAnalytics((req as any).user.sub, req.params.courseId, days);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async teacher(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await analyticsService.teacherAnalytics((req as any).user.sub, days);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async track(req: Request, res: Response, next: NextFunction) {
    try {
      await analyticsService.track({ ...req.body, user: (req as any).user?.sub });
      res.json({ success: true });
    } catch (err) { next(err); }
  },
};