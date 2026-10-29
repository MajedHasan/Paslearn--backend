import ReviewModel from "./review.model";
import CourseModel from "../course.model";
import EnrollmentModel from "../enrollment/enrollment.model";
import { AppError } from "../../../utils/appError";
import { SortOrder } from "mongoose";

async function recalcCourseRating(courseId: any) {
  const agg = await ReviewModel.aggregate([
    { $match: { course: courseId, status: "visible" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const avg = agg[0]?.avg || 0;
  const count = agg[0]?.count || 0;
  await CourseModel.updateOne(
    { _id: courseId },
    { ratingAvg: Math.round(avg * 10) / 10, ratingCount: count }
  );
}

export const reviewService = {
  async create(userId: string, courseId: string, payload: { rating: number; title?: string; comment?: string }) {
    const enrollment = await EnrollmentModel.findOne({ user: userId, course: courseId, status: "active" });
    if (!enrollment) throw new AppError("You must be enrolled to review this course", 403);

    const existing = await ReviewModel.findOne({ user: userId, course: courseId });
    if (existing) throw new AppError("You already reviewed this course", 400);

    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError("Course not found", 404);

    const review = await ReviewModel.create({
      user: userId,
      course: courseId,
      teacher: (course as any).teacher,
      enrollment: enrollment._id,
      orderItemId: enrollment.orderItemId,
      rating: payload.rating,
      title: payload.title,
      comment: payload.comment,
      isVerifiedPurchase: true,
      status: "visible",
    });

    await recalcCourseRating(courseId);
    return review;
  },

  async listForCourse(courseId: string, params: { page?: number; limit?: number; sort?: string } = {}) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 10);

    // ✅ NEW
    let sort: Record<string, SortOrder> = { createdAt: -1 };
    if (params.sort === "helpful") sort = { helpfulCount: -1 };
    else if (params.sort === "rating_high") sort = { rating: -1 };
    else if (params.sort === "rating_low") sort = { rating: 1 };
      

    const [data, total] = await Promise.all([
      ReviewModel.find({ course: courseId, status: "visible" })
        .populate("user", "name profileImageUrl")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ReviewModel.countDocuments({ course: courseId, status: "visible" }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async listForTeacher(teacherId: string, params: { courseId?: string; page?: number; limit?: number } = {}) {
    const filter: any = { teacher: teacherId };
    if (params.courseId) filter.course = params.courseId;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 20);
    const [data, total] = await Promise.all([
      ReviewModel.find(filter)
        .populate("user", "name profileImageUrl")
        .populate("course", "title slug")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ReviewModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async reply(reviewId: string, teacherId: string, text: string) {
    const review = await ReviewModel.findOne({ _id: reviewId, teacher: teacherId });
    if (!review) throw new AppError("Review not found or not yours", 404);
    review.teacherReply = { text, repliedAt: new Date(), repliedBy: teacherId as any };
    await review.save();
    return review;
  },

  async setStatus(reviewId: string, teacherId: string, status: "visible" | "hidden" | "flagged") {
    const review = await ReviewModel.findOne({ _id: reviewId, teacher: teacherId });
    if (!review) throw new AppError("Review not found or not yours", 404);
    review.status = status;
    await review.save();
    await recalcCourseRating(review.course);
    return review;
  },

  async adminModerate(reviewId: string, status: "visible" | "hidden" | "flagged") {
    const review = await ReviewModel.findByIdAndUpdate(reviewId, { status }, { new: true });
    if (!review) throw new AppError("Review not found", 404);
    await recalcCourseRating(review.course);
    return review;
  },

  async markHelpful(reviewId: string, userId: string) {
    const review = await ReviewModel.findByIdAndUpdate(
      reviewId, { $inc: { helpfulCount: 1 } }, { new: true }
    );
    if (!review) throw new AppError("Review not found", 404);
    return review;
  },

  async deleteOwn(userId: string, reviewId: string) {
    // Students can't delete — only flag. This is a "flag" helper.
    const review = await ReviewModel.findOne({ _id: reviewId, user: userId });
    if (!review) throw new AppError("Review not found", 404);
    if (!review.flaggedBy?.includes(userId as any)) {
      review.flaggedBy = [...(review.flaggedBy || []), userId as any];
      review.status = "flagged";
      await review.save();
    }
    return { flagged: true };
  },
};