import { Request, Response, NextFunction } from "express";
import { progressService } from "./progress.service";

export const progressController = {
  async forCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await progressService.getForCourse(
        (req as any).user.sub,
        req.params.courseId
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};