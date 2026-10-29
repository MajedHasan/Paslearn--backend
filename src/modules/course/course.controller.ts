// src/modules/course/course.controller.ts
import { Request, Response, NextFunction } from "express";
import { courseService } from "./course.service";
import { parseListQuery } from "../cruds/utils.query";
import MediaModel from "../media/media.model";
import { getStorageDriver } from "../../storage/storage.factory";
import { AppError } from "../../utils/appError";

async function signCourseThumbnail(course: any) {
  if (course?.thumbnailMediaId?._id) {
    try {
      const media = course.thumbnailMediaId;
      const driver = getStorageDriver();
      if (media.visibility === "public" && media.url) {
        course.thumbnailMediaId.url = media.url;
      } else if (media.key) {
        course.thumbnailMediaId.url = await driver.getSignedUrl(media.key, 3600);
      }
    } catch (err) {
      console.error("thumbnail sign failed", err);
    }
  }
}

export const courseController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const pq = parseListQuery(req, { page: 1, limit: 10 });
      const state = ((req.query.state as string) || "active") as
        | "active" | "archived" | "deleted" | "all";

      const result = await courseService.listOwn({
        userId,
        state,
        filter: pq.filter,
        page: pq.page,
        limit: pq.limit,
        sort: pq.sort,
        q: pq.q,
        searchFields: ["title", "description"],
      });
      await Promise.all(result.data.map(signCourseThumbnail));
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const course = await courseService.getOwn(userId, req.params.id);
      await signCourseThumbnail(course);

      for (const section of (course as any).sections || []) {
        for (const lesson of section.lessons || []) {
          if (!lesson.content) lesson.content = {};
          const content = lesson.content;
          if (content.videoMediaId) {
            const media = await MediaModel.findById(content.videoMediaId).select("name").lean();
            if (media) content.videoMediaName = (media as any).name;
          }
          if (content.fileMediaId) {
            const media = await MediaModel.findById(content.fileMediaId).select("name").lean();
            if (media) content.fileMediaName = (media as any).name;
          }
        }
      }

      res.json({ success: true, data: course });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const validation = await courseService.validatePricing(req.body);
      if (!validation.valid) throw new AppError(validation.message!, 400);
      const doc = await courseService.create(req.body, { userId });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      await courseService.getOwn(userId, req.params.id);
      if (req.body.priceModel) {
        const validation = await courseService.validatePricing(req.body);
        if (!validation.valid) throw new AppError(validation.message!, 400);
      }
      const doc = await courseService.update(req.params.id, req.body, { userId });
      if (!doc) throw new AppError("Course not found", 404);
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  // Soft-delete (replaces the CRUD delete to enforce enrollment safety)
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const reason = req.body?.reason;
      const doc = await courseService.softDelete(userId, req.params.id, reason);
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async softDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const reason = req.body?.reason;
      const doc = await courseService.softDelete(userId, req.params.id, reason);
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const doc = await courseService.restore(userId, req.params.id);
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async deletionInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const info = await courseService.getDeletionInfo(userId, req.params.id);
      res.json({ success: true, data: info });
    } catch (err) {
      next(err);
    }
  },

  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const stats = await courseService.getStatsForTeacher(userId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  },

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const doc = await courseService.publish(userId, req.params.id);
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const doc = await courseService.archive(userId, req.params.id);
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async pauseEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const paused = !!req.body.paused;
      const doc = await courseService.setEnrollmentsPaused(userId, req.params.id, paused);
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async reorderSections(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const { sectionIds } = req.body;
      const doc = await courseService.reorderSections(userId, req.params.id, sectionIds);
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async reorderLessons(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const { lessonIds } = req.body;
      const doc = await courseService.reorderLessons(
        userId, req.params.id, req.params.sectionId, lessonIds
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async duplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const original = await courseService.getOwn(userId, req.params.id);
      const copy: any = { ...original };
      delete copy._id;
      delete copy.createdAt;
      delete copy.updatedAt;
      delete copy.publishedAt;
      delete copy.deletedAt;
      delete copy.mediaRetentionUntil;
      delete copy.deletedBy;
      delete copy.deletionReason;
      delete copy.hardPurgedAt;
      copy.title = `${(original as any).title} (Copy)`;
      copy.status = "draft";
      copy.slug = undefined;
      const doc = await courseService.create(copy, { userId });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  // Iterate soft-delete per course (each one checks active enrollments)
  async bulkDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const ids: string[] = req.body.ids || [];
      if (ids.length === 0) throw new AppError("No IDs provided", 400);

      const results = await Promise.allSettled(
        ids.map((id) => courseService.softDelete(userId, id, "Bulk delete"))
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => r.reason?.message || "Unknown error");

      res.json({
        success: true,
        data: {
          total: ids.length,
          succeeded,
          failedCount: failed.length,
          errors: failed,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async uploadThumbnail(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError("No file", 400);
      const userId = (req as any).user.sub;
      const media = await courseService.uploadThumbnail(userId, req.params.id, req.file);
      res.status(201).json({ success: true, data: media });
    } catch (err) {
      next(err);
    }
  },

  async uploadLessonVideo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError("No file", 400);
      const userId = (req as any).user.sub;
      const { id, sectionId, lessonId } = req.params;
      const media = await courseService.uploadLessonVideo(userId, id, sectionId, lessonId, req.file);
      res.status(201).json({ success: true, data: media });
    } catch (err) {
      next(err);
    }
  },

  async uploadLessonFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError("No file", 400);
      const userId = (req as any).user.sub;
      const { id, sectionId, lessonId } = req.params;
      const media = await courseService.uploadLessonFile(userId, id, sectionId, lessonId, req.file);
      res.status(201).json({ success: true, data: media });
    } catch (err) {
      next(err);
    }
  },

  async getLessonMedia(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const { id, sectionId, lessonId } = req.params;
      const kind = (req.query.kind as string) === "file" ? "file" : "video";
      const result = await courseService.getLessonMedia(
        userId, id, sectionId, lessonId, kind
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};