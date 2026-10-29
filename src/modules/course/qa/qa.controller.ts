import { Request, Response, NextFunction } from "express";
import { qaService } from "./qa.service";

export const qaController = {
  async ask(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await qaService.ask((req as any).user.sub, req.params.courseId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await qaService.listForCourse(req.params.courseId, {
        lessonId: req.query.lessonId as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ success: true, ...data });
    } catch (err) { next(err); }
  },
  async answer(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await qaService.answer(req.params.id, (req as any).user.sub, req.body.body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await qaService.setResolved(req.params.id, (req as any).user.sub, !!req.body.resolved);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async pin(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await qaService.setPinned(req.params.id, (req as any).user.sub, !!req.body.pinned);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async helpful(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await qaService.markAnswerHelpful(req.params.id, req.params.answerId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};