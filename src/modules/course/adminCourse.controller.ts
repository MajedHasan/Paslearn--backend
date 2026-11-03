// src/modules/course/adminCourse.controller.ts
import { Request, Response, NextFunction } from "express";
import CourseModel from "./course.model";
import { courseService } from "./course.service";
import { productService } from "../product/product.service";
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
      const stateRaw = req.query.state;
      const state =
        typeof stateRaw === "string" && stateRaw.trim() ? stateRaw.trim() : "all";

      const pq = parseListQuery(req, { page: 1, limit: 20 });
      const filter: any = { ...pq.filter };

      // Strip every param that could leak from parseListQuery
      delete filter.state;
      delete filter.page;
      delete filter.limit;
      delete filter.sort;
      delete filter.q;
      delete filter._t;
      delete filter.t;

      if (state === "pending") {
        filter.deletedAt = { $exists: false };
        filter.status = { $in: ["draft", "under_review"] };
      } else if (state === "draft") {
        filter.deletedAt = { $exists: false };
        filter.status = "draft";
      } else if (state === "under_review") {
        filter.deletedAt = { $exists: false };
        filter.status = "under_review";
      } else if (state === "published") {
        filter.deletedAt = { $exists: false };
        filter.status = "published";
      } else if (state === "archived") {
        filter.deletedAt = { $exists: false };
        filter.status = "archived";
      } else if (state === "rejected") {
        filter.deletedAt = { $exists: false };
        filter.status = "draft";
        filter.moderationReason = { $exists: true, $ne: null };
      } else if (state === "deleted") {
        filter.deletedAt = { $exists: true, $ne: null };
        filter.hardPurgedAt = null;
      } else if (state === "purged") {
        filter.hardPurgedAt = { $ne: null };
      } else if (state === "active") {
        filter.deletedAt = { $exists: false };
        filter.status = { $ne: "archived" };
      }
      // state === "all" → no filter

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

      console.log(
        `[admin.listAll] state=${state} filter=${JSON.stringify(filter)} page=${page} limit=${limit}`
      );

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

      console.log(`[admin.listAll] state=${state} → found=${data.length} total=${total}`);

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

  // ⭐ NEW — moderate a course (approve / reject / archive / restore)
  async moderate(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user.sub;
      const { action, reason } = req.body || {};

      if (!["approve", "reject", "archive", "restore"].includes(action)) {
        return res.status(400).json({ success: false, message: "Invalid action" });
      }

      const course: any = await CourseModel.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ success: false, message: "Course not found" });
      }
      if (course.deletedAt) {
        return res.status(400).json({
          success: false,
          message: "This course is deleted. Restore it first from the deletion panel.",
        });
      }
      if (course.hardPurgedAt) {
        return res.status(400).json({
          success: false,
          message: "This course has been permanently purged and cannot be moderated.",
        });
      }

      const current = course.status;
      const moderationTime = new Date();

      // ─── APPROVE ─────────────────────────────────
      if (action === "approve") {
        if (current === "published") {
          return res.status(400).json({ success: false, message: "Course is already published" });
        }
        if (current === "archived") {
          return res.status(400).json({
            success: false,
            message: "Restore the course to draft first, then approve.",
          });
        }

        const validation = await courseService.validatePublish(course);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: "Course is not ready to publish",
            errors: validation.errors,
          });
        }

        course.status = "published";
        if (!course.publishedAt) course.publishedAt = moderationTime;
        course.moderationReason = undefined;
        course.moderatedBy = adminId;
        course.moderatedAt = moderationTime;
        await course.save();
        await productService.syncFromCourse(course);

        return res.json({
          success: true,
          message: "Course published",
          data: course.toObject(),
        });
      }

      // ─── REJECT ──────────────────────────────────
      if (action === "reject") {
        if (!reason || !String(reason).trim()) {
          return res.status(400).json({
            success: false,
            message: "Rejection reason is required",
          });
        }
        if (current === "draft") {
          return res.status(400).json({ success: false, message: "Course is already in draft" });
        }
        if (current === "archived") {
          return res.status(400).json({
            success: false,
            message: "Restore the course to draft first, then reject.",
          });
        }

        course.status = "draft";
        course.moderationReason = String(reason).trim();
        course.moderatedBy = adminId;
        course.moderatedAt = moderationTime;
        await course.save();
        await productService.syncFromCourse(course);

        return res.json({
          success: true,
          message: "Course moved to draft",
          data: course.toObject(),
        });
      }

      // ─── ARCHIVE ─────────────────────────────────
      if (action === "archive") {
        if (current === "archived") {
          return res.status(400).json({ success: false, message: "Course is already archived" });
        }
        course.status = "archived";
        course.enrollmentsPaused = true;
        course.moderatedBy = adminId;
        course.moderatedAt = moderationTime;
        if (reason && String(reason).trim()) {
          course.moderationReason = String(reason).trim();
        }
        await course.save();
        await productService.syncFromCourse(course);

        return res.json({
          success: true,
          message: "Course archived",
          data: course.toObject(),
        });
      }

      // ─── RESTORE ─────────────────────────────────
      if (action === "restore") {
        if (current !== "archived") {
          return res.status(400).json({
            success: false,
            message: "Only archived courses can be restored",
          });
        }
        course.status = "draft";
        course.enrollmentsPaused = false;
        course.moderationReason = undefined;
        course.moderatedBy = adminId;
        course.moderatedAt = moderationTime;
        await course.save();
        await productService.syncFromCourse(course);

        return res.json({
          success: true,
          message: "Course restored to draft",
          data: course.toObject(),
        });
      }
    } catch (err) {
      next(err);
    }
  },
};