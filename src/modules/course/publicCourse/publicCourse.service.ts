import CourseModel from "../course.model";
import MediaModel from "../../media/media.model";
import { getStorageDriver } from "../../../storage/storage.factory";
import { AppError } from "../../../utils/appError";
import { SortOrder } from "mongoose";
import ProductModel from "../../product/product.model";

async function signThumb(mediaId: any): Promise<string | null> {
  if (!mediaId) return null;
  const media = await MediaModel.findById(mediaId);
  if (!media?.key) return null;
  const driver = getStorageDriver();
  if (media.visibility === "public" && media.url) return media.url;
  return driver.getSignedUrl(media.key, 3600);
}

export const publicCourseService = {
  async list(params: {
    q?: string;
    category?: string;
    difficulty?: string;
    priceModel?: string;
    language?: string;
    minRating?: number;
    page?: number;
    limit?: number;
    sort?: string;
  }) {
    const filter: any = { status: "published", deletedAt: null };
    if (params.category) filter.category = params.category;
    if (params.difficulty) filter.difficulty = params.difficulty;
    if (params.priceModel) filter.priceModel = params.priceModel;
    if (params.language) filter.language = params.language;
    if (params.minRating && params.minRating > 0) {
      filter.ratingAvg = { $gte: params.minRating };
    }
    if (params.q) {
      filter.$text = { $search: params.q };
    }

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(48, Math.max(1, params.limit || 12));
    const skip = (page - 1) * limit;

    let sort: Record<string, any> = { publishedAt: -1 };
    if (params.sort === "rating") sort = { ratingAvg: -1 };
    else if (params.sort === "popular") sort = { enrollmentCount: -1 };
    else if (params.sort === "price_asc") sort = { "oneTimePricing.price": 1 };
    else if (params.sort === "price_desc") sort = { "oneTimePricing.price": -1 };

    const [data, total] = await Promise.all([
      CourseModel.find(filter)
        .select(
          "title slug subtitle thumbnailMediaId category difficulty language priceModel oneTimePricing subscriptionTiers ratingAvg ratingCount enrollmentCount lessonsCount sectionsCount totalDurationSec certificateEnabled teacher tags publishedAt"
        )
        .populate("teacher", "name profileImageUrl")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseModel.countDocuments(filter),
    ]);

    const signed = await Promise.all(
      data.map(async (c: any) => ({
        ...c,
        thumbnailUrl: await signThumb(c.thumbnailMediaId),
        thumbnailMediaId: undefined,
      }))
    );

    return { data: signed, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getBySlug(slug: string) {
    const course: any = await CourseModel.findOne({
      slug,
      status: "published",
      deletedAt: null,
    })
      .populate("teacher", "name profileImageUrl")
      .populate("prerequisites", "title slug")
      .lean();
    if (!course) throw new AppError("Course not found", 404);

    const thumbnailUrl = await signThumb(course.thumbnailMediaId);
    const promoVideoUrl = await signThumb(course.promoVideoMediaId);

    // ⭐ Find the Product row so frontend can add-to-cart
    const product: any = await ProductModel.findOne({
      type: "course",
      refId: course._id,
      status: "published",
      deletedAt: null,
    })
      .select("_id oneTimePrice subscriptionTiers currency")
      .lean();

    return {
      _id: course._id,
      title: course.title,
      slug: course.slug,
      subtitle: course.subtitle,
      description: course.description,
      category: course.category,
      subcategory: course.subcategory,
      tags: course.tags,
      difficulty: course.difficulty,
      language: course.language,
      courseLevel: course.courseLevel,
      badge: course.badge,
      seoTitle: course.seoTitle,
      seoDescription: course.seoDescription,
      learningObjectives: course.learningObjectives,
      requirements: course.requirements,
      audience: course.audience,
      priceModel: course.priceModel,
      oneTimePricing: course.oneTimePricing,
      subscriptionTiers: (course.subscriptionTiers || []).filter(
        (t: any) => t.isActive
      ),
      ratingAvg: course.ratingAvg,
      ratingCount: course.ratingCount,
      enrollmentCount: course.enrollmentCount,
      lessonsCount: course.lessonsCount,
      sectionsCount: course.sectionsCount,
      totalDurationSec: course.totalDurationSec,
      certificateEnabled: course.certificateEnabled,
      teacher: course.teacher,
      prerequisites: course.prerequisites,
      thumbnailUrl,
      promoVideoUrl,
      publishedAt: course.publishedAt,
      productId: product?._id || null,           // ⭐ NEW
      sections: (course.sections || []).map((s: any) => ({
        id: s.id,
        order: s.order,
        title: s.title,
        description: s.description,
        lessons: (s.lessons || []).map((l: any) => ({
          id: l.id,
          order: l.order,
          title: l.title,
          type: l.type,
          duration: l.duration,
          freePreview: l.freePreview,
          dripDays: l.dripDays,
        })),
      })),
    };
  },

  async getPreviewUrl(slug: string, lessonId: string) {
    const course: any = await CourseModel.findOne({
      slug,
      status: "published",
      deletedAt: null,
    }).lean();
    if (!course) throw new AppError("Course not found", 404);

    let targetLesson: any = null;
    for (const section of course.sections || []) {
      const lesson = (section.lessons || []).find((l: any) => l.id === lessonId);
      if (lesson) {
        targetLesson = lesson;
        break;
      }
    }
    if (!targetLesson) throw new AppError("Lesson not found", 404);
    if (!targetLesson.freePreview)
      throw new AppError("This lesson is not available for preview", 403);

    const base = {
      lessonId: targetLesson.id,
      title: targetLesson.title,
      type: targetLesson.type as string,
      duration: targetLesson.duration || 0,
    };

    // VIDEO — signed URL of the highest-quality rendition
    if (targetLesson.type === "video") {
      const mediaId = targetLesson.content?.videoMediaId;
      if (!mediaId) throw new AppError("Video not available", 404);

      const renditions = await MediaModel.find({
        "metadata.originalMediaId": mediaId,
        status: "ready",
      }).lean();

      const pick = (res: string) =>
        renditions.find((r: any) => r.metadata?.resolution === res);

      const target =
        pick("720p") ||
        pick("480p") ||
        pick("360p") ||
        (await MediaModel.findById(mediaId));

      if (!target?.key) throw new AppError("Video not available", 404);

      const driver = getStorageDriver();
      const url =
        target.visibility === "public" && target.url
          ? target.url
          : await driver.getSignedUrl(target.key, 900);

      return { ...base, url, expiresIn: 900 };
    }

    // FILE — signed URL for the resource
    if (targetLesson.type === "file") {
      const mediaId = targetLesson.content?.fileMediaId;
      if (!mediaId) throw new AppError("File not available", 404);
      const media: any = await MediaModel.findById(mediaId);
      if (!media?.key) throw new AppError("File not available", 404);

      const driver = getStorageDriver();
      const url =
        media.visibility === "public" && media.url
          ? media.url
          : await driver.getSignedUrl(media.key, 900);

      return {
        ...base,
        url,
        name: media.name,
        mimeType: media.mimeType,
        size: media.size,
        expiresIn: 900,
      };
    }

    // TEXT — send full text content
    if (targetLesson.type === "text") {
      return {
        ...base,
        textContent:
          targetLesson.content?.textContent ||
          "This text lesson has no content yet.",
      };
    }

    // ASSIGNMENT — send instructions
    if (targetLesson.type === "assignment") {
      return {
        ...base,
        instructions:
          targetLesson.content?.assignmentInstructions ||
          "This assignment has no instructions yet.",
      };
    }

    // QUIZ / EXAM — fetch from Quiz collection if linked
    if (targetLesson.type === "quiz" || targetLesson.type === "exam") {
      let quizInfo: any = null;
      if (targetLesson.quizId) {
        try {
          const { QuizModel } = await import("../quiz/quiz.model");
          const quiz: any = await QuizModel.findById(targetLesson.quizId).lean();
          if (quiz) {
            quizInfo = {
              title: quiz.title,
              questionCount: (quiz.questions || []).length,
              passingScore: quiz.passingScore,
              timeLimitSec: quiz.timeLimitSec,
            };
          }
        } catch {}
      }
      return {
        ...base,
        quiz: quizInfo || {
          title: targetLesson.title,
          questionCount: 0,
          passingScore: 70,
        },
        note: "Sign up to take the full quiz.",
      };
    }

    throw new AppError("Unsupported lesson type", 400);
  },

};