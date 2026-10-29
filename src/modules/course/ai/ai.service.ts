import AiJobModel from "./ai.model";
import CourseModel from "../course.model";
import MediaModel from "../../media/media.model";
import { getStorageDriver } from "../../../storage/storage.factory";
import { getAiProvider } from "./ai.provider";
import { AiJobType, IAiJob } from "./ai.interface";
import { AppError } from "../../../utils/appError";
import { Types } from "mongoose";

async function resolveLessonContext(lessonId: string) {
  const course = await CourseModel.findOne({ "sections.lessons.id": lessonId }).lean();
  if (!course) throw new AppError("Lesson not found", 404);
  for (const section of (course as any).sections || []) {
    const lesson = (section.lessons || []).find((l: any) => l.id === lessonId);
    if (lesson) return { course, section, lesson };
  }
  throw new AppError("Lesson not found", 404);
}

async function resolveLessonMediaUrl(lessonId: string): Promise<string | null> {
  const { lesson } = await resolveLessonContext(lessonId);
  if (!lesson?.content?.videoMediaId) return null;
  const media: any = await MediaModel.findById(lesson.content.videoMediaId);
  if (!media?.key) return null;
  const driver = getStorageDriver();
  if (media.visibility === "public" && media.url) return media.url;
  return driver.getSignedUrl(media.key, 3600);
}

export const courseAiService = {
  async enqueue(params: {
    type: AiJobType;
    refType: "course" | "lesson";
    refId: string;
    courseId?: string;
    input?: Record<string, any>;
    requestedBy: string;
  }): Promise<IAiJob> {
    return AiJobModel.create({
      type: params.type,
      refType: params.refType,
      refId: params.refId,
      courseId: params.courseId,
      input: params.input || {},
      status: "queued",
      requestedBy: params.requestedBy,
    });
  },

  async process(jobId: string): Promise<IAiJob> {
    const job = await AiJobModel.findById(jobId);
    if (!job) throw new AppError("Job not found", 404);
    if (job.status === "done" || job.status === "processing") return job;
    if (job.status === "cancelled") throw new AppError("Job cancelled", 400);

    job.status = "processing";
    job.startedAt = new Date();
    job.provider = getAiProvider().name;
    await job.save();

    try {
      const ai = getAiProvider();
      let output: any = null;
      const input = (job.input || {}) as any;

      switch (job.type) {
        case "course.auto_quiz": {
          const ctx = input.lessonId
            ? await resolveLessonContext(input.lessonId)
            : null;
          const title = ctx?.lesson?.title || input.title || "Lesson";
          const content = ctx?.lesson?.content?.textContent
            || input.content
            || `Lesson content for ${title}`;
          output = await ai.generateQuiz({ title, content, count: input.count });
          break;
        }
        case "course.summary": {
          // ⭐ Only look up via courseId (or a real ObjectId refId) — never stringify a lesson ID
          let course: any = null;
          if (job.courseId) {
            course = await CourseModel.findById(job.courseId).lean();
          } else if (job.refType === "course") {
            course = await CourseModel.findById(job.refId).lean();
          }
          if (!course) throw new AppError("Course not found for summary job", 404);
          output = await ai.summarize({
            title: course.title,
            content: input.text || course.description || "",
          });
          break;
        }
        case "course.transcript": {
          const mediaUrl =
            input.mediaUrl ||
            (input.lessonId ? await resolveLessonMediaUrl(input.lessonId) : null);
          if (!mediaUrl) throw new AppError("No video available for transcript", 400);
          output = await ai.transcribe({ mediaUrl });
          break;
        }
        case "course.chatbot": {
          output = await ai.chatbot({
            context: input.context || "",
            question: input.question || "",
          });
          break;
        }
        case "course.translate": {
          output = await ai.translate({
            text: input.text || "",
            targetLang: input.targetLang || "es",
          });
          break;
        }
        case "course.personalized_path": {
          if (!job.courseId) throw new AppError("courseId required for personalized path", 400);
          output = await ai.personalizedPath({
            userId: input.userId,
            courseId: String(job.courseId),
            completedLessonIds: input.completedLessonIds || [],
            allLessonIds: input.allLessonIds || [],
          });
          break;
        }
        case "course.outline": {
          output = await ai.generateOutline({
            topic: input.topic || "",
            level: input.level || "beginner",
            lessonCount: input.lessonCount,
          });
          break;
        }
        case "course.description_suggest": {
          output = await ai.suggestDescription({
            title: input.title || "",
            category: input.category,
          });
          break;
        }
        case "course.tag_suggest": {
          output = await ai.suggestTags({
            title: input.title || "",
            description: input.description || "",
          });
          break;
        }
        default:
          throw new AppError(`Unknown job type: ${job.type}`, 400);
      }

      job.output = output;
      job.status = "done";
      job.completedAt = new Date();
    } catch (err: any) {
      job.status = "failed";
      job.error = err?.message || "Unknown error";
      job.completedAt = new Date();
    }

    await job.save();
    return job;
  },

  async cancel(jobId: string, userId: string) {
    const job = await AiJobModel.findOne({ _id: jobId, requestedBy: userId });
    if (!job) throw new AppError("Job not found", 404);
    if (job.status === "done" || job.status === "failed") {
      throw new AppError("Cannot cancel a finished job", 400);
    }
    job.status = "cancelled";
    await job.save();
    return job;
  },

  async retry(jobId: string, userId: string) {
    const job = await AiJobModel.findOne({ _id: jobId, requestedBy: userId });
    if (!job) throw new AppError("Job not found", 404);
    if (job.status !== "failed" && job.status !== "cancelled") {
      throw new AppError("Only failed or cancelled jobs can be retried", 400);
    }
    job.status = "queued";
    job.error = undefined;
    job.output = undefined;
    await job.save();
    return this.process(String(job._id));
  },

  async listMine(userId: string, filters: {
    type?: string;
    status?: string;
    courseId?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const query: any = { requestedBy: userId };
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.courseId) query.courseId = filters.courseId;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, filters.limit || 20);
    const [data, total] = await Promise.all([
      AiJobModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AiJobModel.countDocuments(query),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getJob(jobId: string, userId: string, isAdmin = false) {
    const query: any = isAdmin ? { _id: jobId } : { _id: jobId, requestedBy: userId };
    const job = await AiJobModel.findOne(query).lean();
    if (!job) throw new AppError("Job not found", 404);
    return job;
  },

  async adminList(filters: {
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const query: any = {};
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, filters.limit || 50);
    const [data, total] = await Promise.all([
      AiJobModel.find(query)
        .populate("requestedBy", "name email")
        .populate("courseId", "title slug")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AiJobModel.countDocuments(query),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async stats() {
    const [byStatus, byType, total] = await Promise.all([
      AiJobModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      AiJobModel.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AiJobModel.countDocuments({}),
    ]);
    return { total, byStatus, byType };
  },
};