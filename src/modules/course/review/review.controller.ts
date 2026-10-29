import { Request, Response, NextFunction } from "express";
import { reviewService } from "./review.service";

export const reviewController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reviewService.create((req as any).user.sub, req.params.courseId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },
  async listForCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reviewService.listForCourse(req.params.courseId, {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sort: req.query.sort as string,
      });
      res.json({ success: true, ...data });
    } catch (err) { next(err); }
  },
  async listForTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reviewService.listForTeacher((req as any).user.sub, {
        courseId: req.query.courseId as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ success: true, ...data });
    } catch (err) { next(err); }
  },
  async reply(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reviewService.reply(req.params.id, (req as any).user.sub, req.body.text);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async setStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reviewService.setStatus(req.params.id, (req as any).user.sub, req.body.status);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async adminModerate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reviewService.adminModerate(req.params.id, req.body.status);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async markHelpful(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reviewService.markHelpful(req.params.id, (req as any).user.sub);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async flag(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reviewService.deleteOwn((req as any).user.sub, req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};