// src/modules/enrollment/enrollment.service.ts
import EnrollmentModel from "./enrollment.model";
import CourseModel from "../course.model";
import ProgressModel from "../progress/progress.model";
import { IEnrollment, EnrollmentSource } from "./enrollment.interface";
import { Types } from "mongoose";
import MediaModel from "../../media/media.model";
import { getStorageDriver } from "../../../storage/storage.factory";
import ReviewModel from "../review/review.model";
import CertificateModel from "../certificate/certificate.model";

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
    const enrollments = await EnrollmentModel.find({
      user: userId,
      status: "active",
    })
      .populate({
        path: "course",
        select:
          "title slug thumbnailMediaId lessonsCount totalDurationSec ratingAvg ratingCount category certificateEnabled sections teacher",
        populate: { path: "teacher", select: "name profileImageUrl" },
      })
      .sort({ lastAccessedAt: -1, enrolledAt: -1 })
      .lean();

    const courseIds = enrollments
      .map((e: any) => e.course?._id)
      .filter(Boolean);

    // ⭐ Batch-fetch progress, reviews, certificates in one shot
    const [progressRows, reviewRows, certificateRows] = await Promise.all([
      ProgressModel.find({
        user: userId,
        course: { $in: courseIds },
        isCompleted: true,
      })
        .select("course lessonId")
        .lean(),
      ReviewModel.find({
        user: userId,
        course: { $in: courseIds },
      })
        .select("course rating")
        .lean(),
      CertificateModel.find({
        user: userId,
        course: { $in: courseIds },
        revokedAt: null,
      })
        .select("course certificateNumber verificationSlug issuedAt")
        .lean(),
    ]);

    const completedByCourse = new Map<string, Set<string>>();
    for (const p of progressRows) {
      const key = String(p.course);
      if (!completedByCourse.has(key)) completedByCourse.set(key, new Set());
      completedByCourse.get(key)!.add(p.lessonId);
    }

    const reviewByCourse = new Map<string, any>();
    for (const r of reviewRows) reviewByCourse.set(String((r as any).course), r);

    const certificateByCourse = new Map<string, any>();
    for (const c of certificateRows)
      certificateByCourse.set(String((c as any).course), c);

    const driver = getStorageDriver();

    return Promise.all(
      enrollments.map(async (e: any) => {
        const course = e.course;
        if (!course) return e;

        // ── Thumbnail ──
        let thumbnailUrl: string | null = null;
        if (course.thumbnailMediaId) {
          try {
            const media: any = await MediaModel.findById(
              course.thumbnailMediaId
            );
            if (media?.key) {
              if (media.visibility === "public" && media.url) {
                thumbnailUrl = media.url;
              } else {
                thumbnailUrl = await driver.getSignedUrl(media.key, 3600);
              }
            }
          } catch (err: any) {
            console.error(
              "[enrollment.findMine] thumbnail sign failed:",
              err?.message
            );
          }
        }

        // ── Next lesson ──
        const completed = completedByCourse.get(String(course._id)) || new Set();
        let nextLesson: {
          sectionId: string;
          lessonId: string;
          title: string;
          type: string;
        } | null = null;

        for (const section of course.sections || []) {
          for (const lesson of section.lessons || []) {
            if (!completed.has(lesson.id)) {
              nextLesson = {
                sectionId: section.id,
                lessonId: lesson.id,
                title: lesson.title,
                type: lesson.type,
              };
              break;
            }
          }
          if (nextLesson) break;
        }

        const review = reviewByCourse.get(String(course._id));
        const certificate = certificateByCourse.get(String(course._id));

        const { sections, thumbnailMediaId, ...courseRest } = course;

        return {
          ...e,
          course: {
            ...courseRest,
            thumbnailUrl,
            nextLesson,
          },
          // ⭐ NEW
          hasReviewed: !!review,
          reviewRating: review?.rating || null,
          hasCertificate: !!certificate,
          certificateSlug: (certificate as any)?.verificationSlug || null,
          certificateNumber: (certificate as any)?.certificateNumber || null,
        };
      })
    );
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