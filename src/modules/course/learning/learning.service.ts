// src/modules/learning/learning.service.ts
import CourseModel from "../../course/course.model";
import EnrollmentModel from "../enrollment/enrollment.model";
import MediaModel from "../../media/media.model";
import { entitlementService } from "../../entitlement/entitlement.service";
import { progressService } from "../progress/progress.service";
import { getStorageDriver } from "../../../storage/storage.factory";
import { AppError } from "../../../utils/appError";
import { Types } from "mongoose";
import { enrollmentService } from "../enrollment/enrollment.service";

const PLAYBACK_TTL_SEC = 900; // 15 min
const PREVIEW_TTL_SEC = 900;

function findLesson(course: any, lessonId: string) {
  for (const section of course.sections || []) {
    const lesson = section.lessons.find((l: any) => l.id === lessonId);
    if (lesson) return { section, lesson };
  }
  return null;
}

async function signMedia(mediaId: Types.ObjectId | string | undefined, ttl = PLAYBACK_TTL_SEC) {
  if (!mediaId) return null;
  const media = await MediaModel.findById(mediaId);
  if (!media || media.isFolder) return null;

  const driver = getStorageDriver();
  if (media.visibility === "public" && media.url) {
    return media.url; // already public
  }
  if (!media.key) return null;
  return driver.getSignedUrl(media.key, ttl);
}

export const learningService = {
  /**
   * Learning view — returns course metadata + sections/lessons with preview URLs only.
   * Full lesson URLs are NEVER emitted here.
   */
  async getLearningView(userId: string, courseSlug: string) {
    const course = await CourseModel.findOne({
      slug: courseSlug,
      status: "published",
      deletedAt: null,
    })
      .populate("thumbnailMediaId")
      .lean();

    if (!course) throw new AppError("Course not found", 404);

    // Check entitlement (owner also has access)
    const isOwner = String((course as any).teacher) === userId;
    const ent = isOwner
      ? { source: "owner" }
      : await entitlementService.checkByRef(userId, "course", (course as any)._id);

    if (!ent) throw new AppError("Not enrolled in this course", 403);

    const enrollment = await EnrollmentModel.findOne({
      user: userId,
      course: (course as any)._id,
    }).lean();

    const progressRows = await progressService.getForCourse(userId, String((course as any)._id));
    const progressMap = new Map(progressRows.map((p: any) => [p.lessonId, p]));

    // Build view — strip media IDs, only emit signed URLs for preview OR fully unlocked lessons
    const sections = await Promise.all(
      (course.sections || []).map(async (section: any) => ({
        id: section.id,
        order: section.order,
        title: section.title,
        description: section.description,
        lessons: await Promise.all(
          (section.lessons || []).map(async (lesson: any) => {
            const dripLocked = await isDripLocked(enrollment, lesson);
            const canPlay = !dripLocked && (ent.source === "owner" || ent);

            return {
              id: lesson.id,
              order: lesson.order,
              title: lesson.title,
              type: lesson.type,
              duration: lesson.duration,
              freePreview: lesson.freePreview,
              dripDays: lesson.dripDays,
              locked: !canPlay && !lesson.freePreview,
              dripLocked,
              // for text & assignment lessons, send content inline (they need it)
              textContent:
                lesson.type === "text" && (canPlay || lesson.freePreview)
                  ? lesson.content?.textContent
                  : undefined,
              assignmentInstructions:
                lesson.type === "assignment" && (canPlay || lesson.freePreview)
                  ? lesson.content?.assignmentInstructions
                  : undefined,
              progress: progressMap.get(lesson.id) || null,
              // NO videoMediaId / fileMediaId exposed
            };
          })
        ),
      }))
    );

    return {
      course: {
        _id: (course as any)._id,
        title: (course as any).title,
        slug: (course as any).slug,
        subtitle: (course as any).subtitle,
        thumbnailUrl: await signMedia((course as any).thumbnailMediaId?._id),
        sectionsCount: (course as any).sectionsCount,
        lessonsCount: (course as any).lessonsCount,
        totalDurationSec: (course as any).totalDurationSec,
        certificateEnabled: (course as any).certificateEnabled,
      },
      enrollment: {
        progressPercent: enrollment?.progressPercent ?? 0,
        lessonsCompleted: enrollment?.lessonsCompleted ?? 0,
        completedAt: enrollment?.completedAt ?? null,
      },
      sections,
    };
  },

  /**
   * Secure playback URL. This is the ONLY endpoint that signs lesson media.
   */
  async getPlaybackUrl(userId: string, courseSlug: string, lessonId: string) {
    const course = await CourseModel.findOne({
      slug: courseSlug,
      status: "published",
      deletedAt: null,
    }).lean();
    if (!course) throw new AppError("Course not found", 404);

    const found = findLesson(course, lessonId);
    if (!found) throw new AppError("Lesson not found", 404);
    const { lesson } = found;

    // Preview lessons: always allowed to any authenticated user
    if (lesson.freePreview) {
      return this.buildPlaybackPayload(lesson, PREVIEW_TTL_SEC);
    }

    const isOwner = String((course as any).teacher) === userId;
    if (!isOwner) {
      const ent = await entitlementService.checkByRef(
        userId,
        "course",
        (course as any)._id
      );
      if (!ent) throw new AppError("Not enrolled", 403);

      const enrollment = await EnrollmentModel.findOne({
        user: userId,
        course: (course as any)._id,
      }).lean();
      if (await isDripLocked(enrollment, lesson)) {
        throw new AppError("Lesson locked by drip schedule", 403);
      }

      // Touch access timestamp (fire & forget)
      if (enrollment) enrollmentService.touchAccess(String(enrollment._id));
    }

    return this.buildPlaybackPayload(lesson, PLAYBACK_TTL_SEC);
  },

  async buildPlaybackPayload(lesson: any, ttl: number) {
    if (lesson.type === "video") {
      const url = await signMedia(lesson.content?.videoMediaId, ttl);
      if (!url) throw new AppError("Video not available", 404);
      return { type: "video" as const, url, expiresIn: ttl };
    }
    if (lesson.type === "file") {
      const url = await signMedia(lesson.content?.fileMediaId, ttl);
      if (!url) throw new AppError("File not available", 404);
      return { type: "file" as const, url, expiresIn: ttl };
    }
    throw new AppError("Lesson has no playable content", 400);
  },
};

async function isDripLocked(enrollment: any, lesson: any): Promise<boolean> {
  if (!lesson.dripDays || lesson.dripDays <= 0) return false;
  if (!enrollment?.enrolledAt) return true;
  const unlockAt =
    new Date(enrollment.enrolledAt).getTime() + lesson.dripDays * 86_400_000;
  return Date.now() < unlockAt;
}

// import here to avoid circular in buildPlaybackPayload — but keep top-level