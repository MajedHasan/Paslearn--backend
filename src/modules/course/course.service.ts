// src/modules/course/course.service.ts
import { createCrudService } from "../cruds/crud.service";
import CourseModel from "./course.model";
import { mediaService } from "../media/media.service";
import { productService } from "../product/product.service";
import { startTranscoding } from "../../queues/transcoder";
import { ICourse } from "./course.interface";
import slugify from "slugify";
import { Types } from "mongoose";
import { AppError } from "../../utils/appError";
import MediaModel from "../media/media.model";
import { getStorageDriver } from "../../storage/storage.factory";
import EnrollmentModel from "./enrollment/enrollment.model";
import OrderModel from "../order/order.model";

const RETENTION_DAYS = 90;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = slugify(base, { lower: true, strict: true }) || `course-${Date.now()}`;
  let suffix = 1;
  while (true) {
    const filter: any = { slug };
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await CourseModel.exists(filter);
    if (!exists) return slug;
    suffix += 1;
    slug = `${slugify(base, { lower: true, strict: true })}-${suffix}`;
  }
}

/**
 * Permanently remove all media associated with a course (original + renditions).
 * Safe to call multiple times — missing media is skipped.
 */
async function purgeCourseMedia(courseId: string) {
  const course: any = await CourseModel.findById(courseId).lean();
  if (!course) return { deleted: 0 };

  const mediaIds: any[] = [];
  if (course.thumbnailMediaId) mediaIds.push(course.thumbnailMediaId);
  if (course.promoVideoMediaId) mediaIds.push(course.promoVideoMediaId);
  for (const section of course.sections || []) {
    for (const lesson of section.lessons || []) {
      if (lesson.content?.videoMediaId) mediaIds.push(lesson.content.videoMediaId);
      if (lesson.content?.fileMediaId) mediaIds.push(lesson.content.fileMediaId);
    }
  }

  if (mediaIds.length === 0) return { deleted: 0 };

  // Collect originals + all renditions (transcoded versions)
  const originals = await MediaModel.find({ _id: { $in: mediaIds } });
  const renditions = await MediaModel.find({
    "metadata.originalMediaId": { $in: mediaIds },
  });

  const allMedia = [...originals, ...renditions];
  const driver = getStorageDriver();

  for (const media of allMedia) {
    if (media.key && (!media.storageDriver || media.storageDriver === driver.name)) {
      try {
        await driver.delete(media.key);
      } catch (err: any) {
        console.error(`[purgeCourseMedia] failed to delete ${media.key}:`, err?.message);
      }
    }
  }

  const allIds = allMedia.map((m) => m._id);
  if (allIds.length > 0) {
    await MediaModel.deleteMany({ _id: { $in: allIds } });
  }

  return { deleted: allIds.length };
}

// ─────────────────────────────────────────────────────────────
// CRUD service (unchanged — preserves media merge + product sync)
// ─────────────────────────────────────────────────────────────

export const courseCrudService = createCrudService(CourseModel, {
  searchFields: ["title", "description"],
  softDeleteField: "deletedAt",
  allowedPopulate: ["thumbnailMediaId", "promoVideoMediaId", "teacher", "prerequisites"],
  allowedFilterFields: [
    "teacher", "category", "difficulty", "status", "priceModel", "courseLevel", "tags",
  ],
  defaultSort: "-createdAt",
  beforeCreate: async (payload: any, context: any) => {
    if (!payload.teacher && context?.userId) payload.teacher = context.userId;
    if (!payload.slug && payload.title) {
      payload.slug = await ensureUniqueSlug(payload.title);
    } else if (payload.slug) {
      payload.slug = await ensureUniqueSlug(payload.slug);
    }
    return payload;
  },
  beforeUpdate: async (id: string, payload: any) => {
    if (payload.title && !payload.slug) {
      payload.slug = await ensureUniqueSlug(payload.title, id);
    } else if (payload.slug) {
      payload.slug = await ensureUniqueSlug(payload.slug, id);
    }

    // ⭐ Merge lesson content — preserve media refs the payload doesn't touch
    if (Array.isArray(payload.sections)) {
      const existing = await CourseModel.findById(id).select("sections").lean();
      const existingSections: any[] = (existing as any)?.sections || [];

      payload.sections = payload.sections.map((newSection: any) => {
        const existingSection = existingSections.find((s: any) => s.id === newSection.id);
        const mergedLessons = (newSection.lessons || []).map((newLesson: any) => {
          const existingLesson = existingSection?.lessons?.find((l: any) => l.id === newLesson.id);
          const existingContent = existingLesson?.content || {};
          const newContent = newLesson.content || {};

          return {
            ...newLesson,
            content: {
              videoMediaId: newContent.videoMediaId || existingContent.videoMediaId || null,
              fileMediaId: newContent.fileMediaId || existingContent.fileMediaId || null,
              textContent: newContent.textContent ?? existingContent.textContent ?? "",
              assignmentInstructions:
                newContent.assignmentInstructions ?? existingContent.assignmentInstructions ?? "",
              transcriptKey: newContent.transcriptKey || existingContent.transcriptKey,
            },
          };
        });
        return { ...newSection, lessons: mergedLessons };
      });
    }

    return payload;
  },
  afterCreate: async (doc: any) => {
    await productService.syncFromCourse(doc);
    return doc;
  },
  afterUpdate: async (doc: any) => {
    if (doc) await productService.syncFromCourse(doc);
    return doc;
  },
});

// ─────────────────────────────────────────────────────────────
// Course service
// ─────────────────────────────────────────────────────────────

export const courseService = {
  ...courseCrudService,

  // ── Listing ───────────────────────────────────────────

  async listOwn(params: {
    userId: string;
    state?: "active" | "archived" | "deleted" | "all";
    filter?: any;
    page?: number;
    limit?: number;
    sort?: string;
    q?: string;
    searchFields?: string[];
    populate?: any;
  }) {
    const filter = { ...(params.filter || {}) };
    filter.teacher = params.userId;

    const state = params.state || "active";
    if (state === "archived") {
      filter.status = "archived";
      filter.deletedAt = { $exists: false };
    } else if (state === "deleted") {
      filter.deletedAt = { $exists: true, $ne: null };
      // deleted courses are always status=archived, so we don't force status
      delete filter.status;
    } else if (state === "all") {
      // no deletedAt/status filter
    } else {
      // "active" (default) — not deleted AND not archived
      filter.deletedAt = { $exists: false };
      if (!filter.status) filter.status = { $ne: "archived" };
    }

    return courseCrudService.list({
      filter,
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      sort: params.sort ?? "-createdAt",
      q: params.q,
      searchFields: params.searchFields ?? ["title", "description"],
      populate: params.populate ?? ["thumbnailMediaId", "teacher"],
    });
  },

  // ── Ownership ─────────────────────────────────────────

  async getOwn(userId: string, courseId: string) {
    const course = await courseCrudService.getById(courseId, {
      populate: ["thumbnailMediaId", "teacher", "prerequisites"],
    });
    if (!course) throw new AppError("Course not found", 404);
    if (String((course as any).teacher?._id ?? (course as any).teacher) !== userId) {
      throw new AppError("Forbidden", 403);
    }
    return course;
  },

  /**
   * Returns a real Mongoose document (needed for .save()).
   * By default rejects deleted courses. Pass `allowDeleted: true` to operate on
   * deleted courses (used by restore, getDeletionInfo).
   */
  async getOwnDoc(
    userId: string,
    courseId: string,
    opts: { allowDeleted?: boolean } = {}
  ) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError("Course not found", 404);
    if (!opts.allowDeleted && (course as any).deletedAt) {
      throw new AppError("Course not found", 404);
    }
    if (String((course as any).teacher) !== userId) {
      throw new AppError("Forbidden", 403);
    }
    return course;
  },

  // ── Stats ─────────────────────────────────────────────

  async getStatsForTeacher(userId: string) {
    const teacherId = new Types.ObjectId(userId);

    const [courseStats] = await CourseModel.aggregate([
      { $match: { teacher: teacherId, deletedAt: null } },
      {
        $group: {
          _id: null,
          totalCourses: { $sum: 1 },
          publishedCourses: { $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] } },
          totalStudents: { $sum: "$enrollmentCount" },
          totalRevenueCents: { $sum: "$revenueCents" },
          ratingSum: { $sum: { $multiply: ["$ratingAvg", "$ratingCount"] } },
          ratingTotal: { $sum: "$ratingCount" },
        },
      },
    ]);

    if (!courseStats) {
      return { totalCourses: 0, publishedCourses: 0, totalStudents: 0, totalRevenue: 0, avgRating: 0 };
    }

    return {
      totalCourses: courseStats.totalCourses,
      publishedCourses: courseStats.publishedCourses,
      totalStudents: courseStats.totalStudents,
      totalRevenue: courseStats.totalRevenueCents / 100,
      avgRating:
        courseStats.ratingTotal > 0
          ? Math.round((courseStats.ratingSum / courseStats.ratingTotal) * 10) / 10
          : 0,
    };
  },

  // ── Validation ────────────────────────────────────────

  async validatePricing(course: Partial<ICourse>) {
    if (!course.priceModel) return { valid: false, message: "Price model required" };
    if (course.priceModel === "free") return { valid: true };
    if (course.priceModel === "onetime") {
      if (!course.oneTimePricing || course.oneTimePricing.price <= 0) {
        return { valid: false, message: "One-time price must be > 0" };
      }
      return { valid: true };
    }
    if (course.priceModel === "subscription") {
      if (!course.subscriptionTiers || course.subscriptionTiers.length === 0) {
        return { valid: false, message: "At least one subscription tier required" };
      }
      const active = course.subscriptionTiers.filter((t) => t.isActive);
      if (active.length === 0) return { valid: false, message: "At least one active tier required" };
      for (const t of active) {
        if (t.price <= 0) return { valid: false, message: `Price for ${t.interval} must be > 0` };
      }
    }
    return { valid: true };
  },

  async validatePublish(course: any) {
    const errors: string[] = [];
    if (!course.title) errors.push("Title required");
    if (!course.description) errors.push("Description required");
    if (!course.category) errors.push("Category required");
    if (!course.thumbnailMediaId) errors.push("Thumbnail required");
    if (!course.sections || course.sections.length === 0) errors.push("At least one section required");
    else if (!course.sections.some((s: any) => s.lessons?.length > 0)) {
      errors.push("At least one lesson required");
    }
    const pricing = await this.validatePricing(course);
    if (!pricing.valid) errors.push(pricing.message!);
    return { valid: errors.length === 0, errors };
  },

  // ── Lifecycle ─────────────────────────────────────────

  async publish(userId: string, courseId: string) {
    const course = await this.getOwnDoc(userId, courseId);
    const validation = await this.validatePublish(course);
    if (!validation.valid) throw new AppError(validation.errors.join("; "), 400);
    course.status = "published";
    if (!course.publishedAt) course.publishedAt = new Date();
    await course.save();
    await productService.syncFromCourse(course);
    return course.toObject();
  },

  async archive(userId: string, courseId: string) {
    const course = await this.getOwnDoc(userId, courseId);
    course.status = "archived";
    course.enrollmentsPaused = true;
    await course.save();
    await productService.syncFromCourse(course);
    return course.toObject();
  },

  async setEnrollmentsPaused(userId: string, courseId: string, paused: boolean) {
    const course = await this.getOwnDoc(userId, courseId);
    course.enrollmentsPaused = paused;
    await course.save();
    return course.toObject();
  },

  // ── Deletion & retention ─────────────────────────────

  async softDelete(userId: string, courseId: string, reason?: string) {
    const course = await this.getOwnDoc(userId, courseId);

    if ((course as any).deletedAt) {
      throw new AppError("Course is already deleted", 400);
    }

    const activeEnrollments = await EnrollmentModel.countDocuments({
      course: courseId,
      status: "active",
    });
    if (activeEnrollments > 0) {
      throw new AppError(
        `${activeEnrollments} student(s) still have active access. Archive the course instead — they keep access, and you can delete it later once all enrollments are done.`,
        409
      );
    }

    const now = new Date();
    const retentionUntil = new Date(now.getTime() + RETENTION_DAYS * 86_400_000);

    course.deletedAt = now;
    course.mediaRetentionUntil = retentionUntil;
    course.deletedBy = userId as any;
    course.deletionReason = reason;
    course.status = "archived";
    course.enrollmentsPaused = true;
    await course.save();
    await productService.syncFromCourse(course);

    return {
      ...course.toObject(),
      mediaRetentionUntil: retentionUntil,
      retentionDays: RETENTION_DAYS,
    };
  },

  async restore(userId: string, courseId: string) {
    const course = await this.getOwnDoc(userId, courseId, { allowDeleted: true });

    if (!(course as any).deletedAt) {
      throw new AppError("Course is not deleted", 400);
    }
    if ((course as any).hardPurgedAt) {
      throw new AppError(
        "Media for this course has been permanently purged and cannot be restored.",
        410
      );
    }

    course.deletedAt = null;
    course.mediaRetentionUntil = null;
    course.deletedBy = null;
    course.deletionReason = undefined;
    course.status = "draft";
    await course.save();
    await productService.syncFromCourse(course);
    return course.toObject();
  },

  async getDeletionInfo(userId: string, courseId: string) {
    const course = await this.getOwnDoc(userId, courseId, { allowDeleted: true });

    const [activeEnrollments, totalEnrollments, revenueAgg] = await Promise.all([
      EnrollmentModel.countDocuments({ course: courseId, status: "active" }),
      EnrollmentModel.countDocuments({ course: courseId }),
      OrderModel.aggregate([
        { $match: { status: "paid" } },
        { $unwind: "$items" },
        {
          $match: {
            "items.refId": new Types.ObjectId(courseId),
            "items.productType": "course",
          },
        },
        { $group: { _id: null, total: { $sum: "$items.finalPrice" } } },
      ]),
    ]);

    const isDeleted = !!(course as any).deletedAt;
    const isHardPurged = !!(course as any).hardPurgedAt;
    const retentionUntil = (course as any).mediaRetentionUntil as Date | null;

    const canArchive = !isDeleted && (course as any).status !== "archived" && !isHardPurged;
    const canDelete = !isDeleted && activeEnrollments === 0 && !isHardPurged;
    const canRestore = isDeleted && !isHardPurged;

    let recommendedAction: "archive" | "delete" | "restore" | "none" = "none";
    let message = "";

    if (isDeleted) {
      if (isHardPurged) {
        message = "This course has been permanently purged. It cannot be restored.";
      } else {
        recommendedAction = "restore";
        const daysLeft = retentionUntil
          ? Math.max(0, Math.ceil((retentionUntil.getTime() - Date.now()) / 86_400_000))
          : 0;
        message = `This course is deleted. Media will be permanently removed in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. You can still restore it.`;
      }
    } else if (activeEnrollments > 0) {
      recommendedAction = "archive";
      message = `${activeEnrollments} student${activeEnrollments === 1 ? " has" : "s have"} active access. Archive the course instead — they keep access, and you can delete later.`;
    } else if (canDelete) {
      recommendedAction = "delete";
      message = `Safe to delete. All videos and files will be permanently removed after ${RETENTION_DAYS} days.`;
    }

    return {
      activeEnrollments,
      totalEnrollments,
      totalRevenue: revenueAgg[0]?.total || 0,
      status: (course as any).status,
      deleted: isDeleted,
      deletedAt: (course as any).deletedAt,
      mediaRetentionUntil: retentionUntil,
      hardPurgedAt: (course as any).hardPurgedAt,
      canArchive,
      canDelete,
      canRestore,
      canPurge: false, // teachers can't purge — admin only
      recommendedAction,
      retentionDays: RETENTION_DAYS,
      message,
    };
  },

  // ── Admin-only ────────────────────────────────────────

  async adminPurge(courseId: string, adminId: string, reason?: string, force = false) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError("Course not found", 404);

    const activeEnrollments = await EnrollmentModel.countDocuments({
      course: courseId,
      status: "active",
    });
    if (activeEnrollments > 0 && !force) {
      throw new AppError(
        `Cannot purge: ${activeEnrollments} active enrollment(s). Refund those students first, then pass force:true.`,
        409
      );
    }

    const { deleted: mediaDeleted } = await purgeCourseMedia(courseId);

    course.hardPurgedAt = new Date();
    course.deletedAt = (course as any).deletedAt || new Date();
    course.mediaRetentionUntil = null;
    course.deletionReason = reason || (course as any).deletionReason;
    (course as any).sections = [];
    (course as any).sectionsCount = 0;
    (course as any).lessonsCount = 0;
    (course as any).totalDurationSec = 0;
    (course as any).thumbnailMediaId = null;
    (course as any).promoVideoMediaId = null;
    (course as any).status = "archived";
    (course as any).enrollmentsPaused = true;
    (course as any).description = "[Content permanently removed]";
    (course as any).deletedBy = adminId;
    await course.save();
    await productService.archiveForRef("course", courseId);

    return {
      purged: true,
      purgedAt: (course as any).hardPurgedAt,
      mediaDeleted,
      forcedOverride: activeEnrollments > 0 && force,
    };
  },

  async cleanupExpiredCourses(purgedBy: string) {
    const now = new Date();
    const expired = await CourseModel.find({
      deletedAt: { $exists: true, $ne: null },
      mediaRetentionUntil: { $lte: now },
      hardPurgedAt: null,
    }).select("_id title");

    const details: any[] = [];
    for (const course of expired) {
      // Safety: skip if somehow there are still active enrollments
      const activeEnrollments = await EnrollmentModel.countDocuments({
        course: course._id,
        status: "active",
      });
      if (activeEnrollments > 0) {
        details.push({
          id: course._id,
          title: (course as any).title,
          success: false,
          skipped: true,
          error: `${activeEnrollments} active enrollment(s) — deferring purge`,
        });
        continue;
      }

      try {
        await this.adminPurge(
          String(course._id),
          purgedBy,
          "Auto-purge after retention window",
          false
        );
        details.push({ id: course._id, title: (course as any).title, success: true });
      } catch (e: any) {
        details.push({
          id: course._id,
          title: (course as any).title,
          success: false,
          error: e?.message,
        });
      }
    }

    return {
      cleaned: details.filter((d) => d.success).length,
      skipped: details.filter((d) => d.skipped).length,
      details,
    };
  },

  // ── Reorder ───────────────────────────────────────────

  async reorderSections(userId: string, courseId: string, sectionIds: string[]) {
    const course = await this.getOwnDoc(userId, courseId);
    const map = new Map((course.sections as any[]).map((s: any) => [s.id, s]));
    course.sections = sectionIds
      .map((id, idx) => {
        const section: any = map.get(id);
        if (section) section.order = idx;
        return section;
      })
      .filter(Boolean) as any;
    await course.save();
    return course.toObject();
  },

  async reorderLessons(userId: string, courseId: string, sectionId: string, lessonIds: string[]) {
    const course = await this.getOwnDoc(userId, courseId);
    const section = (course.sections as any[]).find((s: any) => s.id === sectionId);
    if (!section) throw new AppError("Section not found", 404);
    const map = new Map((section.lessons as any[]).map((l: any) => [l.id, l]));
    section.lessons = lessonIds
      .map((id, idx) => {
        const lesson: any = map.get(id);
        if (lesson) lesson.order = idx;
        return lesson;
      })
      .filter(Boolean);
    await course.save();
    return course.toObject();
  },

  // ── Media uploads ─────────────────────────────────────

  async uploadThumbnail(userId: string, courseId: string, file: Express.Multer.File) {
    const course = await this.getOwnDoc(userId, courseId);
    const media = await mediaService.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      userId,
      folder: `courses/${courseId}/thumbnail`,
      visibility: "public",
    });
    course.thumbnailMediaId = (media as any)._id;
    await course.save();
    await productService.syncFromCourse(course);
    return media;
  },

  async uploadLessonVideo(
    userId: string,
    courseId: string,
    sectionId: string,
    lessonId: string,
    file: Express.Multer.File
  ) {
    const course = await this.getOwnDoc(userId, courseId);
    const section = (course.sections as any[]).find((s: any) => s.id === sectionId);
    if (!section) throw new AppError("Section not found", 404);
    const lesson = (section.lessons as any[]).find((l: any) => l.id === lessonId);
    if (!lesson) throw new AppError("Lesson not found", 404);

    const media = await mediaService.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      userId,
      folder: `courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`,
      visibility: "private",
    });

    const result = await CourseModel.updateOne(
      { _id: courseId },
      { $set: { "sections.$[s].lessons.$[l].content.videoMediaId": (media as any)._id } },
      { arrayFilters: [{ "s.id": sectionId }, { "l.id": lessonId }] }
    );
    if (result.matchedCount === 0) throw new AppError("Failed to link video", 500);

    try { startTranscoding(String((media as any)._id)); } catch {}
    return media;
  },

  async uploadLessonFile(
    userId: string,
    courseId: string,
    sectionId: string,
    lessonId: string,
    file: Express.Multer.File
  ) {
    const course = await this.getOwnDoc(userId, courseId);
    const section = (course.sections as any[]).find((s: any) => s.id === sectionId);
    if (!section) throw new AppError("Section not found", 404);
    const lesson = (section.lessons as any[]).find((l: any) => l.id === lessonId);
    if (!lesson) throw new AppError("Lesson not found", 404);

    const media = await mediaService.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      userId,
      folder: `courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/file`,
      visibility: "private",
    });

    const result = await CourseModel.updateOne(
      { _id: courseId },
      { $set: { "sections.$[s].lessons.$[l].content.fileMediaId": (media as any)._id } },
      { arrayFilters: [{ "s.id": sectionId }, { "l.id": lessonId }] }
    );
    if (result.matchedCount === 0) throw new AppError("Failed to link file", 500);
    return media;
  },

  // ── Media preview (teacher edit) ──────────────────────

  async getLessonMedia(
    userId: string,
    courseId: string,
    sectionId: string,
    lessonId: string,
    kind: "video" | "file"
  ) {
    const course = await this.getOwnDoc(userId, courseId);
    const section = (course.sections as any[]).find((s: any) => s.id === sectionId);
    if (!section) throw new AppError("Section not found", 404);
    const lesson = (section.lessons as any[]).find((l: any) => l.id === lessonId);
    if (!lesson) throw new AppError("Lesson not found", 404);

    const content = lesson.content || {};
    const mediaId = kind === "video" ? content.videoMediaId : content.fileMediaId;
    if (!mediaId) throw new AppError(`No ${kind} uploaded`, 404);

    let targetMedia: any = null;

    if (kind === "video") {
      // Prefer 720p → 480p → 360p → original
      const renditions = await MediaModel.find({
        "metadata.originalMediaId": mediaId,
        status: "ready",
      }).lean();

      const pick = (res: string) =>
        renditions.find((r: any) => r.metadata?.resolution === res);

      targetMedia =
        pick("720p") || pick("480p") || pick("360p") ||
        (await MediaModel.findById(mediaId));
    } else {
      targetMedia = await MediaModel.findById(mediaId);
    }

    if (!targetMedia) throw new AppError("Media not found", 404);

    const driver = getStorageDriver();
    let url: string;
    if (targetMedia.visibility === "public" && targetMedia.url) {
      url = targetMedia.url;
    } else {
      if (!targetMedia.key) throw new AppError("Media has no storage key", 500);
      url = await driver.getSignedUrl(targetMedia.key, 3600);
    }

    return {
      url,
      name: targetMedia.name,
      mimeType: targetMedia.mimeType,
      size: targetMedia.size,
      expiresIn: 3600,
    };
  },
};