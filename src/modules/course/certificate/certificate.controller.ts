import { Request, Response, NextFunction } from "express";
import { certificateService } from "./certificate.service";

export const certificateController = {
  async myList(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await certificateService.listMine((req as any).user.sub);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async request(req: Request, res: Response, next: NextFunction) {
    try {
      const cert = await certificateService.issueIfEligible((req as any).user.sub, req.params.courseId);
      res.json({ success: true, data: cert });
    } catch (err) { next(err); }
  },
  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await certificateService.verify(req.params.slug);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async manualIssue(req: Request, res: Response, next: NextFunction) {
    try {
      const cert = await certificateService.manualIssue(
        (req as any).user.sub, req.body.courseId, req.body.userId
      );
      res.status(201).json({ success: true, data: cert });
    } catch (err) { next(err); }
  },
  async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const cert = await certificateService.revoke(
        (req as any).user.sub, req.params.id, req.body.reason
      );
      res.json({ success: true, data: cert });
    } catch (err) { next(err); }
  },
};