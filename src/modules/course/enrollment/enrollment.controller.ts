import { Request, Response, NextFunction } from "express";
import { enrollmentService } from "./enrollment.service";

export const enrollmentController = {
  async myList(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await enrollmentService.findMine((req as any).user.sub);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};