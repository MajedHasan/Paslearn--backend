// src/modules/enrollment/enrollment.service.ts
import EnrollmentModel from "./enrollment.model";
import CourseModel from "../course.model";
import ProgressModel from "../progress/progress.model";
import { IEnrollment, EnrollmentSource } from "./enrollment.interface";
import { Types } from "mongoose";

export const enrollmentService = {
  async createFromEntitlement(params: {
    userId: string | Types.ObjectId;
    courseId: string | Types.ObjectId;
    teacherId: string | Types.ObjectId;
    entitlementId: string | Types.ObjectId;
    productId?: string | Types.ObjectId;
    orderItemId?: string | Types.ObjectId;
    source: EnrollmentSource;
    expiresAt?: Date | null;
  }): Promise<IEnrollment> {
    const existing = await EnrollmentModel.findOne({
      user: params.userId,
      course: params.courseId,
    });
    if (existing) {
      if (existing.status !== "active") {
        existing.status = "active";
        existing.cancelledAt = null;
        existing.expiresAt = params.expiresAt ?? existing.expiresAt;
        await existing.save();
      }
      return existing;
    }

    const enrollment = await EnrollmentModel.create({
      user: params.userId,
      course: params.courseId,
      teacher: params.teacherId,
      product: params.productId,
      entitlement: params.entitlementId,
      source: params.source,
      orderItemId: params.orderItemId,
      expiresAt: params.expiresAt ?? null,
      status: "active",
      enrolledAt: new Date(),
    });

    // increment course counter
    await CourseModel.updateOne(
      { _id: params.courseId },
      { $inc: { enrollmentCount: 1 } }
    );

    return enrollment;
  },

  async findMine(userId: string) {
    return EnrollmentModel.find({ user: userId, status: "active" })
      .populate("course", "title slug thumbnailMediaId lessonsCount totalDurationSec ratingAvg")
      .sort({ enrolledAt: -1 })
      .lean();
  },

  async findForUserCourse(userId: string, courseId: string) {
    return EnrollmentModel.findOne({ user: userId, course: courseId });
  },

  async touchAccess(enrollmentId: string) {
    return EnrollmentModel.findByIdAndUpdate(
      enrollmentId,
      { lastAccessedAt: new Date() },
      { new: false }
    );
  },

  /**
   * Recompute progress from Progress rows. Called after each lesson complete.
   */
  async recomputeProgress(userId: string, courseId: string) {
    const course = await CourseModel.findById(courseId).lean();
    if (!course) return null;

    const totalLessons = course.lessonsCount || 0;
    if (totalLessons === 0) {
      return EnrollmentModel.findOneAndUpdate(
        { user: userId, course: courseId },
        { progressPercent: 0, lessonsCompleted: 0 },
        { new: true }
      );
    }

    const completed = await ProgressModel.countDocuments({
      user: userId,
      course: courseId,
      isCompleted: true,
    });

    const percent = Math.min(100, Math.round((completed / totalLessons) * 100));

    const update: any = {
      progressPercent: percent,
      lessonsCompleted: completed,
      lastAccessedAt: new Date(),
    };
    if (percent >= 100) update.completedAt = new Date();

    return EnrollmentModel.findOneAndUpdate(
      { user: userId, course: courseId },
      update,
      { new: true }
    );
  },
};