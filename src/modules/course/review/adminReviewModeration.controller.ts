// src/modules/course/review/adminReviewModeration.controller.ts
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import ReviewModel from "./review.model";
import CourseModel from "../course.model";
import UserModel from "../../../models/user.model";
import { reviewService } from "./review.service";
import { AppError } from "../../../utils/appError";

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export const adminReviewModerationController = {
  /**
   * GET /api/admin/review-moderation/counts
   */
  async counts(_req: Request, res: Response, next: NextFunction) {
    try {
      const [all, visible, hidden, flagged, pending] = await Promise.all([
        ReviewModel.countDocuments({}).catch(() => 0),
        ReviewModel.countDocuments({ status: "visible" }).catch(() => 0),
        ReviewModel.countDocuments({ status: "hidden" }).catch(() => 0),
        ReviewModel.countDocuments({ status: "flagged" }).catch(() => 0),
        ReviewModel.countDocuments({ status: "pending" }).catch(() => 0),
      ]);
      res.json({ success: true, data: { all, visible, hidden, flagged, pending } });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/admin/review-moderation
   * Query: status (all|visible|hidden|flagged|pending), search, page, limit
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const skip = (page - 1) * limit;
      const status = String(req.query.status || "all").trim();
      const search = String(req.query.search || "").trim();

      const filter: any = {};
      if (["visible", "hidden", "flagged", "pending"].includes(status)) {
        filter.status = status;
      }

      if (search) {
        const [courses, users] = await Promise.all([
          CourseModel.find({ title: { $regex: search, $options: "i" } })
            .select("_id")
            .limit(100)
            .lean()
            .catch(() => []),
          UserModel.find({
            $or: [
              { email: { $regex: search, $options: "i" } },
              { name: { $regex: search, $options: "i" } },
            ],
          })
            .select("_id")
            .limit(100)
            .lean()
            .catch(() => []),
        ]);
        const courseIds = courses.map((c: any) => c._id);
        const userIds = users.map((u: any) => u._id);

        filter.$or = [
          { comment: { $regex: search, $options: "i" } },
          { title: { $regex: search, $options: "i" } },
          ...(courseIds.length ? [{ course: { $in: courseIds } }] : []),
          ...(userIds.length ? [{ user: { $in: userIds } }] : []),
        ];
      }

      const [data, total] = await Promise.all([
        ReviewModel.find(filter)
          .populate("user", "name email profileImageUrl")
          .populate("course", "title slug thumbnailMediaId")
          .populate("teacher", "name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ReviewModel.countDocuments(filter),
      ]);

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

  /**
   * PATCH /api/admin/review-moderation/:id/hide
   */
  async hide(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isValidId(req.params.id)) throw new AppError("Invalid review ID", 400);
      const adminId = (req as any).user?.sub;
      const reason = String(req.body?.reason || "").trim() || undefined;

      const review = await reviewService.adminModerate(req.params.id, "hidden", {
        adminId,
        reason,
      });

      res.json({ success: true, data: review });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/admin/review-moderation/:id/show
   */
  async show(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isValidId(req.params.id)) throw new AppError("Invalid review ID", 400);
      const adminId = (req as any).user?.sub;

      const review = await reviewService.adminModerate(req.params.id, "visible", {
        adminId,
      });

      res.json({ success: true, data: review });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/admin/review-moderation/:id
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isValidId(req.params.id)) throw new AppError("Invalid review ID", 400);

      const review: any = await ReviewModel.findById(req.params.id);
      if (!review) throw new AppError("Review not found", 404);

      const courseId = review.course;
      await ReviewModel.deleteOne({ _id: req.params.id });

      // Recalc rating for the affected course
      await reviewService.adminModerate(req.params.id, "hidden", {}).catch(() => {});
      // Direct recalc:
      const agg = await ReviewModel.aggregate([
        { $match: { course: courseId, status: "visible" } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]);
      await CourseModel.updateOne(
        { _id: courseId },
        {
          ratingAvg: Math.round((agg[0]?.avg || 0) * 10) / 10,
          ratingCount: agg[0]?.count || 0,
        }
      );

      res.json({ success: true, data: { _id: req.params.id, deleted: true } });
    } catch (err) {
      next(err);
    }
  },
};