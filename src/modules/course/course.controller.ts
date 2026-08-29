// src/modules/course/course.controller.ts
import { Request, Response, NextFunction } from "express";
import { createCrudController } from "../cruds/crud.controller";
import { courseService } from "./course.service";
import { parseListQuery } from "../cruds/utils.query";

const baseController = createCrudController(courseService);

export const courseController = {
  ...baseController,

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pq = parseListQuery(req, { page: 1, limit: 10 });
      // Force filter to current teacher
      pq.filter.teacher = (req as any).user._id || (req as any).user.sub;
      const result = await courseService.list({
        ...pq,
        userId: (req as any).user._id || (req as any).user.sub,
        searchFields: ["title", "description"],
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = await courseService.validatePricing(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }
      const doc = await courseService.create(req.body, { userId: (req as any).user._id || (req as any).user.sub });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.body.priceModel) {
        const validation = await courseService.validatePricing(req.body);
        if (!validation.valid) {
          return res.status(400).json({ success: false, message: validation.message });
        }
      }
      const doc = await courseService.update(req.params.id, req.body, { userId: (req as any).user._id || (req as any).user.sub });
      if (!doc) return res.status(404).json({ success: false, message: "Course not found" });
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  // New stats endpoint
  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id || (req as any).user.sub;
      const stats = await courseService.getStatsForTeacher(userId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  },

  // Upload thumbnail
  async uploadThumbnail(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "No file" });
      const media = await courseService.uploadThumbnail(req.params.id, req.file);
      res.status(201).json({ success: true, data: media });
    } catch (err) {
      next(err);
    }
  },

  // Upload lesson video
  async uploadLessonVideo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "No file" });
      const { id: courseId, sectionId, lessonId } = req.params;
      const media = await courseService.uploadLessonVideo(courseId, sectionId, lessonId, req.file);
      res.status(201).json({ success: true, data: media });
    } catch (err) {
      next(err);
    }
  },

  // Upload lesson file
  async uploadLessonFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "No file" });
      const { id: courseId, sectionId, lessonId } = req.params;
      const media = await courseService.uploadLessonFile(courseId, sectionId, lessonId, req.file);
      res.status(201).json({ success: true, data: media });
    } catch (err) {
      next(err);
    }
  },

  // Transcode lesson video
  async transcodeLessonVideo(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: courseId, sectionId, lessonId } = req.params;
      const result = await courseService.transcodeLessonVideo(courseId, sectionId, lessonId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};