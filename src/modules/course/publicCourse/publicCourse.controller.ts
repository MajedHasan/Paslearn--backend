import { Request, Response, NextFunction } from "express";
import { publicCourseService } from "./publicCourse.service";

export const publicCourseController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await publicCourseService.list({
        q: req.query.q as string,
        category: req.query.category as string,
        difficulty: req.query.difficulty as string,
        priceModel: req.query.priceModel as string,
        language: req.query.language as string,
        minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 12,
        sort: req.query.sort as string,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await publicCourseService.getBySlug(req.params.slug);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await publicCourseService.getPreviewUrl(
        req.params.slug,
        req.params.lessonId
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

};