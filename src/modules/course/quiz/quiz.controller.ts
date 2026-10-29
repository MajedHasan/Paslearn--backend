import { Request, Response, NextFunction } from "express";
import { quizService } from "./quiz.service";

export const quizController = {
  // Teacher
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const quiz = await quizService.createOrUpdate(req.params.courseId, (req as any).user.sub, req.body);
      res.status(201).json({ success: true, data: quiz });
    } catch (err) { next(err); }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const quiz = await quizService.createOrUpdate(
        req.params.courseId, (req as any).user.sub, req.body, req.params.quizId
      );
      res.json({ success: true, data: quiz });
    } catch (err) { next(err); }
  },
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const quizzes = await quizService.listForCourse(req.params.courseId, (req as any).user.sub);
      res.json({ success: true, data: quizzes });
    } catch (err) { next(err); }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const quiz = await quizService.deleteQuiz(req.params.quizId, (req as any).user.sub);
      res.json({ success: true, data: quiz });
    } catch (err) { next(err); }
  },

  // Student
  async getForStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await quizService.getForStudent((req as any).user.sub, req.params.quizId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async startAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await quizService.startAttempt((req as any).user.sub, req.params.quizId);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },
  async submitAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await quizService.submitAttempt(
        (req as any).user.sub, req.params.attemptId, req.body.answers || []
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async getAttemptDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await quizService.getAttemptDetail((req as any).user.sub, req.params.attemptId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};