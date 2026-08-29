// src/modules/course/course.service.ts
import { createCrudService } from "../cruds/crud.service";
import CourseModel from "./course.model";
import { mediaService } from "../media/media.service";
import { startTranscoding } from "../../queues/transcoder";
import { ICourse } from "./course.interface";
import slugify from "slugify";
import { Types } from "mongoose";

// Base CRUD service with hooks
export const courseCrudService = createCrudService(CourseModel, {
  searchFields: ["title", "description"],
  softDeleteField: "deletedAt",
  allowedPopulate: ["thumbnailMediaId", "teacher", "prerequisites"],
  allowedFilterFields: ["teacher", "category", "difficulty", "status", "priceModel", "courseLevel"],
  defaultSort: "-createdAt",
  // Hook to set teacher and slug before creating
  beforeCreate: (payload: any, context: any) => {
    if (!payload.teacher && context?.userId) {
      payload.teacher = context.userId;
    }
    if (!payload.slug && payload.title) {
      payload.slug = slugify(payload.title, { lower: true, strict: true }) || `course-${Date.now()}`;
    }
    return payload;
  },
  // Hook to ensure slug is set on update if missing
  beforeUpdate: async (id: string, payload: any, context: any) => {
    if (!payload.slug && payload.title) {
      payload.slug = slugify(payload.title, { lower: true, strict: true }) || `course-${Date.now()}`;
    }
    return payload;
  },
});

// Course service with custom methods
export const courseService = {
  ...courseCrudService,

  // Override list to always filter by teacher and populate thumbnail and teacher
  async list({
    userId,
    filter = {},
    page = 1,
    limit = 10,
    sort = "-createdAt",
    search,
    searchFields = ["title", "description"],
    populate,
  }: any) {
    // Ensure teacher filter
    filter.teacher = userId;

    // Default populate if not provided
    const finalPopulate = populate || ["thumbnailMediaId", "teacher"];

    return courseCrudService.list({
      filter,
      page,
      limit,
      sort,
      q: search,
      searchFields,
      populate: finalPopulate,
    });
  },

  // Get aggregated stats for teacher dashboard
  async getStatsForTeacher(userId: string) {
    const match = {
      teacher: new Types.ObjectId(userId),
      deletedAt: { $exists: false },
    };

    const stats = await CourseModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalCourses: { $sum: 1 },
          publishedCourses: {
            $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
          },
          totalStudents: { $sum: "$students" },
          totalRevenue: { $sum: { $multiply: ["$price", "$students"] } },
          avgRating: { $avg: "$rating" },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        totalCourses: 0,
        publishedCourses: 0,
        totalStudents: 0,
        totalRevenue: 0,
        avgRating: 0,
      };
    }

    const s = stats[0];
    return {
      totalCourses: s.totalCourses,
      publishedCourses: s.publishedCourses,
      totalStudents: s.totalStudents || 0,
      totalRevenue: s.totalRevenue || 0,
      avgRating: s.avgRating ? Math.round(s.avgRating * 10) / 10 : 0,
    };
  },

  // Validate pricing structure based on priceModel
  async validatePricing(course: Partial<ICourse>) {
    if (!course.priceModel) return { valid: false, message: "Price model required" };

    switch (course.priceModel) {
      case "free":
        return { valid: true };
      case "onetime":
        if (!course.oneTimePricing || course.oneTimePricing.price <= 0) {
          return { valid: false, message: "One‑time price must be > 0" };
        }
        return { valid: true };
      case "subscription":
        if (!course.subscriptionTiers || course.subscriptionTiers.length === 0) {
          return { valid: false, message: "At least one subscription tier required" };
        }
        const activeTiers = course.subscriptionTiers.filter((t) => t.isActive);
        if (activeTiers.length === 0) {
          return { valid: false, message: "At least one active tier required" };
        }
        for (const tier of activeTiers) {
          if (tier.price <= 0) {
            return { valid: false, message: `Price for ${tier.interval} must be > 0` };
          }
        }
        return { valid: true };
      default:
        return { valid: false, message: "Invalid price model" };
    }
  },

  // Upload course thumbnail
  async uploadThumbnail(courseId: string, file: Express.Multer.File) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new Error("Course not found");

    const media = await mediaService.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      userId: course.teacher.toString(),
      folder: `courses/${courseId}/thumbnail`,
    });

    course.thumbnailMediaId = media._id;
    await course.save();
    return media;
  },

  // Upload video for a lesson
  async uploadLessonVideo(
    courseId: string,
    sectionId: string,
    lessonId: string,
    file: Express.Multer.File
  ) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new Error("Course not found");
    const section = course.sections.find((s) => s.id === sectionId);
    if (!section) throw new Error("Section not found");
    const lesson = section.lessons.find((l) => l.id === lessonId);
    if (!lesson) throw new Error("Lesson not found");

    const media = await mediaService.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      userId: course.teacher.toString(),
      folder: `courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`,
    });

    lesson.content.videoMediaId = media._id.toString();
    lesson.content.videoUrl = media.url || media._id.toString();
    await course.save();
    return media;
  },

  // Upload file for a lesson
  async uploadLessonFile(
    courseId: string,
    sectionId: string,
    lessonId: string,
    file: Express.Multer.File
  ) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new Error("Course not found");
    const section = course.sections.find((s) => s.id === sectionId);
    if (!section) throw new Error("Section not found");
    const lesson = section.lessons.find((l) => l.id === lessonId);
    if (!lesson) throw new Error("Lesson not found");

    const media = await mediaService.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      userId: course.teacher.toString(),
      folder: `courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/file`,
    });

    lesson.content.fileMediaId = media._id.toString();
    lesson.content.fileUrl = media.url || media._id.toString();
    await course.save();
    return media;
  },

  // Start transcoding for an uploaded video
  async transcodeLessonVideo(courseId: string, sectionId: string, lessonId: string) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new Error("Course not found");
    const section = course.sections.find((s) => s.id === sectionId);
    if (!section) throw new Error("Section not found");
    const lesson = section.lessons.find((l) => l.id === lessonId);
    if (!lesson) throw new Error("Lesson not found");

    if (!lesson.content.videoMediaId) {
      throw new Error("No video uploaded for this lesson");
    }

    startTranscoding(lesson.content.videoMediaId);
    return { success: true, message: "Transcoding started" };
  },
};