import QaThreadModel from "./qa.model";
import CourseModel from "../course.model";
import { entitlementService } from "../../entitlement/entitlement.service";
import { AppError } from "../../../utils/appError";

export const qaService = {
  async ask(userId: string, courseId: string, payload: { title: string; body: string; lessonId?: string }) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError("Course not found", 404);
    const ent = await entitlementService.checkByRef(userId, "course", courseId);
    if (!ent) throw new AppError("Not enrolled", 403);

    return QaThreadModel.create({
      course: courseId,
      teacher: (course as any).teacher,
      lessonId: payload.lessonId,
      user: userId,
      title: payload.title,
      body: payload.body,
    });
  },

  async listForCourse(courseId: string, params: { lessonId?: string; page?: number; limit?: number } = {}) {
    const filter: any = { course: courseId };
    if (params.lessonId) filter.lessonId = params.lessonId;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 20);
    const [data, total] = await Promise.all([
      QaThreadModel.find(filter)
        .populate("user", "name profileImageUrl")
        .populate("answers.user", "name profileImageUrl")
        .sort({ isPinned: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      QaThreadModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async answer(threadId: string, userId: string, body: string) {
    const thread = await QaThreadModel.findById(threadId);
    if (!thread) throw new AppError("Thread not found", 404);
    const isInstructor = String(thread.teacher) === userId;
    if (!isInstructor) {
      const ent = await entitlementService.checkByRef(userId, "course", String(thread.course));
      if (!ent) throw new AppError("Not enrolled", 403);
    }
    thread.answers.push({
      user: userId as any,
      body,
      isInstructorAnswer: isInstructor,
      helpfulCount: 0,
      createdAt: new Date(),
    } as any);
    await thread.save();
    return thread;
  },

  async setResolved(threadId: string, userId: string, resolved: boolean) {
    const thread = await QaThreadModel.findById(threadId);
    if (!thread) throw new AppError("Thread not found", 404);
    if (String(thread.user) !== userId && String(thread.teacher) !== userId) {
      throw new AppError("Forbidden", 403);
    }
    thread.isResolved = resolved;
    await thread.save();
    return thread;
  },

  async setPinned(threadId: string, teacherId: string, pinned: boolean) {
    const thread = await QaThreadModel.findOneAndUpdate(
      { _id: threadId, teacher: teacherId },
      { isPinned: pinned },
      { new: true }
    );
    if (!thread) throw new AppError("Thread not found or not yours", 404);
    return thread;
  },

  async markAnswerHelpful(threadId: string, answerId: string) {
    const thread = await QaThreadModel.findOneAndUpdate(
      { _id: threadId, "answers._id": answerId },
      { $inc: { "answers.$.helpfulCount": 1 } },
      { new: true }
    );
    if (!thread) throw new AppError("Thread or answer not found", 404);
    return thread;
  },
};