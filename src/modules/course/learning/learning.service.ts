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
import CertificateModel from "../certificate/certificate.model";
import ReviewModel from "../review/review.model";
import { QuizModel } from "../quiz/quiz.model";

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
    const course: any = await CourseModel.findOne({
      slug: courseSlug,
      status: "published",
      deletedAt: null,
    })
      .populate("thumbnailMediaId")
      .populate("teacher", "name profileImageUrl")
      .lean();

    if (!course) throw new AppError("Course not found", 404);

    const isOwner = String(course.teacher?._id ?? course.teacher) === userId;
    const ent = isOwner
      ? { source: "owner" }
      : await entitlementService.checkByRef(userId, "course", course._id);

    if (!ent) throw new AppError("Not enrolled in this course", 403);

    const [enrollment, progressRows, existingCertificate, existingReview] =
      await Promise.all([
        EnrollmentModel.findOne({ user: userId, course: course._id }).lean(),
        progressService.getForCourse(userId, String(course._id)),
        CertificateModel.findOne({ user: userId, course: course._id }).lean(),
        ReviewModel.findOne({ user: userId, course: course._id }).lean(),
      ]);

    const progressMap = new Map(
      progressRows.map((p: any) => [p.lessonId, p])
    );

    const sections = await Promise.all(
      (course.sections || []).map(async (section: any, si: number) => ({
        id: section.id,
        order: section.order ?? si,
        title: section.title,
        description: section.description,
        lessons: await Promise.all(
          (section.lessons || []).map(async (lesson: any) => {
            const dripLocked = await isDripLocked(enrollment, lesson);
            const canPlay = !dripLocked && (ent.source === "owner" || !!ent);

            // ── Drip unlock date ──
            let unlocksAt: Date | null = null;
            if (lesson.dripDays > 0 && (enrollment as any)?.enrolledAt) {
              unlocksAt = new Date(
                new Date((enrollment as any).enrolledAt).getTime() +
                  lesson.dripDays * 86_400_000
              );
            }

            // ⭐ QUIZ RESOLUTION — the fix
            let resolvedQuizId: string | null = lesson.quizId
              ? String(lesson.quizId)
              : null;

            if (
              !resolvedQuizId &&
              (lesson.type === "quiz" || lesson.type === "exam")
            ) {
              try {
                const quizFilter: any = {
                  course: course._id,
                  lessonId: lesson.id,
                  deletedAt: null,
                };
                // Only require published for non-owners
                if (!isOwner) quizFilter.isPublished = true;

                const q = await QuizModel.findOne(quizFilter)
                  .select("_id")
                  .sort({ createdAt: -1 })
                  .lean();
                if (q) resolvedQuizId = String((q as any)._id);
              } catch (err: any) {
                console.error(
                  `[getLearningView] quiz lookup failed for lesson ${lesson.id}:`,
                  err?.message
                );
              }
            }

            return {
              id: lesson.id,
              order: lesson.order,
              title: lesson.title,
              type: lesson.type,
              duration: lesson.duration,
              freePreview: lesson.freePreview,
              dripDays: lesson.dripDays,
              quizId: resolvedQuizId, // ⭐ populated via fallback
              locked: !canPlay && !lesson.freePreview,
              dripLocked,
              unlocksAt: dripLocked ? unlocksAt : null,
              textContent:
                lesson.type === "text" && (canPlay || lesson.freePreview)
                  ? lesson.content?.textContent
                  : undefined,
              assignmentInstructions:
                lesson.type === "assignment" &&
                (canPlay || lesson.freePreview)
                  ? lesson.content?.assignmentInstructions
                  : undefined,
              progress: progressMap.get(lesson.id) || null,
            };
          })
        ),
      }))
    );

    const progressPercent = (enrollment as any)?.progressPercent ?? 0;
    const isComplete = progressPercent >= 100;
    const courseCompletedCriteria =
      course.completionCriteria === "manual"
        ? (enrollment as any)?.completedAt != null
        : isComplete;

    const certificateIssued =
      !!existingCertificate && !(existingCertificate as any).revokedAt;

    return {
      course: {
        _id: course._id,
        title: course.title,
        slug: course.slug,
        subtitle: course.subtitle,
        thumbnailUrl: await signMedia(course.thumbnailMediaId?._id),
        sectionsCount: course.sectionsCount,
        lessonsCount: course.lessonsCount,
        totalDurationSec: course.totalDurationSec,
        certificateEnabled: course.certificateEnabled,
        certificateAutoIssue: course.certificateAutoIssue,
        completionCriteria: course.completionCriteria,
        category: course.category,
        difficulty: course.difficulty,
        ratingAvg: course.ratingAvg,
        ratingCount: course.ratingCount,
        teacher: course.teacher
          ? {
              _id: course.teacher._id,
              name: course.teacher.name,
              profileImageUrl: course.teacher.profileImageUrl,
            }
          : null,
      },
      enrollment: {
        progressPercent,
        lessonsCompleted: (enrollment as any)?.lessonsCompleted ?? 0,
        completedAt: (enrollment as any)?.completedAt ?? null,
        enrolledAt: (enrollment as any)?.enrolledAt ?? null,
      },
      certificate: {
        issued: certificateIssued,
        canClaim:
          courseCompletedCriteria &&
          course.certificateEnabled &&
          !certificateIssued &&
          !isOwner,
        certificateId: existingCertificate
          ? String((existingCertificate as any)._id)
          : null,
        certificateNumber:
          (existingCertificate as any)?.certificateNumber || null,
        verificationSlug:
          (existingCertificate as any)?.verificationSlug || null,
        issuedAt: (existingCertificate as any)?.issuedAt || null,
      },
      review: {
        exists: !!existingReview,
        canReview: courseCompletedCriteria && !existingReview && !isOwner,
        rating: (existingReview as any)?.rating || null,
        title: (existingReview as any)?.title || null,
        comment: (existingReview as any)?.comment || null,
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