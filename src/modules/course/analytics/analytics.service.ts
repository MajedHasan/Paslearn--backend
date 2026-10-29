import EventModel from "./analytics.model";
import CourseModel from "../course.model";
import EnrollmentModel from "../enrollment/enrollment.model";
import OrderModel from "../../order/order.model";
import ReviewModel from "../review/review.model";
import { AnalyticsEventType } from "./analytics.interface";
import { Types } from "mongoose";

export const analyticsService = {
  async track(params: {
    eventType: AnalyticsEventType;
    course?: string;
    teacher?: string;
    user?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await EventModel.create({
        eventType: params.eventType,
        course: params.course,
        teacher: params.teacher,
        user: params.user,
        metadata: params.metadata,
      });
    } catch (err) { console.error("analytics.track failed", err); }
  },

  async courseAnalytics(teacherId: string, courseId: string, days = 30) {
    const course = await CourseModel.findOne({ _id: courseId, teacher: teacherId }).lean();
    if (!course) return null;

    const since = new Date(Date.now() - days * 86_400_000);

    const [eventCounts, revenueAgg, enrollmentCount, reviewCount, enrollmentsByDay] = await Promise.all([
      EventModel.aggregate([
        { $match: { course: new Types.ObjectId(courseId), createdAt: { $gte: since } } },
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
      ]),
      OrderModel.aggregate([
        { $match: { status: "paid", paidAt: { $gte: since } } },
        { $unwind: "$items" },
        { $match: { "items.refId": new Types.ObjectId(courseId), "items.productType": "course" } },
        { $group: { _id: null, revenue: { $sum: "$items.finalPrice" }, count: { $sum: 1 } } },
      ]),
      EnrollmentModel.countDocuments({ course: courseId, status: "active" }),
      ReviewModel.countDocuments({ course: courseId, status: "visible" }),
      EnrollmentModel.aggregate([
        { $match: { course: new Types.ObjectId(courseId), enrolledAt: { $gte: since } } },
        { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$enrolledAt" } },
          count: { $sum: 1 },
        } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const counts: Record<string, number> = {};
    eventCounts.forEach((e: any) => { counts[e._id] = e.count; });

    return {
      course: { _id: (course as any)._id, title: (course as any).title, slug: (course as any).slug },
      summary: {
        totalEnrollments: enrollmentCount,
        totalRevenue: revenueAgg[0]?.revenue || 0,
        totalOrders: revenueAgg[0]?.count || 0,
        totalReviews: reviewCount,
        ratingAvg: (course as any).ratingAvg,
        views: counts["course_view"] || 0,
        completionRate: Math.round(
          ((await EnrollmentModel.countDocuments({ course: courseId, completedAt: { $ne: null } })) /
            Math.max(1, enrollmentCount)) * 100
        ),
      },
      events: counts,
      enrollmentsByDay,
    };
  },

  async teacherAnalytics(teacherId: string, days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);
    const tId = new Types.ObjectId(teacherId);

    const [courses, totalRevenue, enrollments, topCourses] = await Promise.all([
      CourseModel.countDocuments({ teacher: tId, deletedAt: null }),
      OrderModel.aggregate([
        { $match: { status: "paid", paidAt: { $gte: since } } },
        { $unwind: "$items" },
        { $match: { "items.teacher": tId } },
        { $group: { _id: null, revenue: { $sum: "$items.finalPrice" }, count: { $sum: 1 } } },
      ]),
      EnrollmentModel.countDocuments({ teacher: tId, status: "active" }),
      OrderModel.aggregate([
        { $match: { status: "paid", paidAt: { $gte: since } } },
        { $unwind: "$items" },
        { $match: { "items.teacher": tId } },
        { $group: {
          _id: "$items.refId",
          revenue: { $sum: "$items.finalPrice" },
          sales: { $sum: 1 },
        } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "course" } },
        { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
        { $project: {
          _id: 0,
          courseId: "$_id",
          title: "$course.title",
          slug: "$course.slug",
          revenue: 1, sales: 1,
        } },
      ]),
    ]);

    return {
      totalCourses: courses,
      totalRevenue: totalRevenue[0]?.revenue || 0,
      totalOrders: totalRevenue[0]?.count || 0,
      totalEnrollments: enrollments,
      topCourses,
      periodDays: days,
    };
  },
};