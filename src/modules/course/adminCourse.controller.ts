// src/modules/course/adminCourse.controller.ts
import { Request, Response, NextFunction } from "express";
import CourseModel from "./course.model";
import { courseService } from "./course.service";
import { parseListQuery } from "../cruds/utils.query";
import { getStorageDriver } from "../../storage/storage.factory";

async function signThumb(course: any) {
  if (!course?.thumbnailMediaId?._id) return;
  try {
    const media = course.thumbnailMediaId;
    const driver = getStorageDriver();
    if (media.visibility === "public" && media.url) {
      course.thumbnailMediaId.url = media.url;
    } else if (media.key) {
      course.thumbnailMediaId.url = await driver.getSignedUrl(media.key, 3600);
    }
  } catch (err) {
    console.error("admin sign thumb failed", err);
  }
}

export const adminCourseController = {
  async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const pq = parseListQuery(req, { page: 1, limit: 20 });
      const state = (req.query.state as string) || "all";
      const filter: any = { ...pq.filter };

      if (state === "active") {
        filter.deletedAt = { $exists: false };
        filter.status = { $ne: "archived" };
      } else if (state === "archived") {
        filter.status = "archived";
        filter.deletedAt = { $exists: false };
      } else if (state === "deleted") {
        filter.deletedAt = { $exists: true, $ne: null };
        filter.hardPurgedAt = null;
      } else if (state === "purged") {
        filter.hardPurgedAt = { $ne: null };
      }
      // state === "all" → no filters

      if (req.query.teacher) filter.teacher = req.query.teacher;
      if (req.query.q) {
        filter.$or = [
          { title: { $regex: req.query.q, $options: "i" } },
          { slug: { $regex: req.query.q, $options: "i" } },
        ];
      }

      const page = pq.page || 1;
      const limit = pq.limit || 20;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        CourseModel.find(filter)
          .populate("teacher", "name email")
          .populate("thumbnailMediaId", "url key visibility")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        CourseModel.countDocuments(filter),
      ]);

      await Promise.all(data.map(signThumb));

      res.json({
        success: true,
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const course = await CourseModel.findById(req.params.id)
        .populate("teacher", "name email")
        .populate("thumbnailMediaId")
        .lean();
      if (!course) return res.status(404).json({ success: false, message: "Course not found" });
      await signThumb(course as any);
      res.json({ success: true, data: course });
    } catch (err) {
      next(err);
    }
  },

  async purge(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user.sub;
      const force = !!req.body?.force;
      const reason = req.body?.reason;
      const result = await courseService.adminPurge(req.params.id, adminId, reason, force);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async cleanupExpired(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user.sub;
      const result = await courseService.cleanupExpiredCourses(adminId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const [total, active, archived, deleted, purged] = await Promise.all([
        CourseModel.countDocuments({}),
        CourseModel.countDocuments({
          deletedAt: { $exists: false },
          status: { $ne: "archived" },
        }),
        CourseModel.countDocuments({
          deletedAt: { $exists: false },
          status: "archived",
        }),
        CourseModel.countDocuments({
          deletedAt: { $exists: true, $ne: null },
          hardPurgedAt: null,
        }),
        CourseModel.countDocuments({ hardPurgedAt: { $ne: null } }),
      ]);
      res.json({ success: true, data: { total, active, archived, deleted, purged } });
    } catch (err) {
      next(err);
    }
  },
};