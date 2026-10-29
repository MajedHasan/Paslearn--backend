// src/modules/learning/learning.controller.ts
import { Request, Response, NextFunction } from "express";
import { learningService } from "./learning.service";
import { progressService } from "../progress/progress.service";

export const learningController = {
  async getCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const view = await learningService.getLearningView(userId, req.params.slug);
      res.json({ success: true, data: view });
    } catch (err) {
      next(err);
    }
  },

  async getPlaybackUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const payload = await learningService.getPlaybackUrl(
        userId,
        req.params.slug,
        req.params.lessonId
      );
      res.json({ success: true, data: payload });
    } catch (err) {
      next(err);
    }
  },

  async updateProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const { courseId, sectionId, lessonId } = req.params;
      const { watchedSeconds, lastPositionSec, isCompleted } = req.body;
      const result = await progressService.record({
        userId,
        courseId,
        sectionId,
        lessonId,
        watchedSeconds,
        lastPositionSec,
        isCompleted,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};