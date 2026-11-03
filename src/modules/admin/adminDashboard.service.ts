// src/modules/admin/adminDashboard.service.ts
import mongoose from "mongoose";
import User from "../../models/user.model";
import Course from "../course/course.model";
import Order from "../order/order.model";
import TeacherPayout from "../teacher/earnings/teacherPayout.model";
import { AppError } from "../../utils/appError";

const DAY_MS = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════

export async function getDashboard(adminId: string) {
  const d30 = startOfDay(daysAgo(30));
  const d7 = startOfDay(daysAgo(7));

  const [
    admin, userAgg, courseAgg, orderAgg, payoutAgg, revenueAgg,
    revenueByDay, signupsByDay, recentUsers, recentOrders, recentPayouts,
    topTeachers, topCourses,
  ] = await Promise.all([
    User.findById(adminId).select("name email profileImageUrl").lean().catch(() => null),

    User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          banned: { $sum: { $cond: [{ $eq: ["$status", "banned"] }, 1, 0] } },
        },
      },
    ]).catch(() => []),

    Course.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).catch(() => []),

    Order.aggregate([
      {
        $facet: {
          total: [{ $count: "n" }],
          last30: [{ $match: { createdAt: { $gte: d30 } } }, { $count: "n" }],
          byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        },
      },
    ]).catch(() => [{ total: [], last30: [], byStatus: [] }]),

    TeacherPayout.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, sum: { $sum: "$amount" } } },
    ]).catch(() => []),

    Order.aggregate([
      { $match: { status: "paid" } },
      {
        $facet: {
          total: [{ $group: { _id: null, sum: { $sum: "$total" }, count: { $sum: 1 } } }],
          last30: [{ $match: { paidAt: { $gte: d30 } } }, { $group: { _id: null, sum: { $sum: "$total" } } }],
          last7: [{ $match: { paidAt: { $gte: d7 } } }, { $group: { _id: null, sum: { $sum: "$total" } } }],
          fees30: [
            { $match: { paidAt: { $gte: d30 } } },
            { $unwind: "$items" },
            { $group: { _id: null, sum: { $sum: "$items.platformFee" } } },
          ],
        },
      },
    ]).catch(() => [{ total: [], last30: [], last7: [], fees30: [] }]),

    Order.aggregate([
      { $match: { status: "paid", paidAt: { $gte: d30 } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).catch(() => []),

    User.aggregate([
      { $match: { createdAt: { $gte: d30 } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).catch(() => []),

    User.find({}).select("name email role createdAt").sort({ createdAt: -1 }).limit(6).lean().catch(() => []),
    Order.find({}).select("orderNumber total currency status createdAt").sort({ createdAt: -1 }).limit(6).lean().catch(() => []),
    TeacherPayout.find({}).populate("teacher", "name email").sort({ createdAt: -1 }).limit(4).lean().catch(() => []),

    Order.aggregate([
      { $match: { status: "paid" } },
      { $unwind: "$items" },
      { $group: { _id: "$items.teacher", revenue: { $sum: "$items.finalPrice" }, sales: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "teacher" } },
      { $unwind: { path: "$teacher", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, teacherId: "$_id", revenue: 1, sales: 1, name: "$teacher.name", email: "$teacher.email" } },
    ]).catch(() => []),

    Order.aggregate([
      { $match: { status: "paid" } },
      { $unwind: "$items" },
      { $match: { "items.productType": "course" } },
      { $group: { _id: "$items.refId", revenue: { $sum: "$items.finalPrice" }, sales: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "course" } },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, courseId: "$_id", revenue: 1, sales: 1, title: "$course.title", slug: "$course.slug" } },
    ]).catch(() => []),
  ]);

  const users = { total: 0, teachers: 0, students: 0, admins: 0, banned: 0 };
  (userAgg as any[]).forEach((u) => {
    users.total += u.count;
    users.banned += u.banned || 0;
    if (u._id === "teacher") users.teachers = u.count;
    if (u._id === "student") users.students = u.count;
    if (u._id === "admin") users.admins = u.count;
  });

  const courses = { total: 0, published: 0, underReview: 0, draft: 0, archived: 0 };
  (courseAgg as any[]).forEach((c) => {
    courses.total += c.count;
    if (c._id === "published") courses.published = c.count;
    if (c._id === "under_review") courses.underReview = c.count;
    if (c._id === "draft") courses.draft = c.count;
    if (c._id === "archived") courses.archived = c.count;
  });

  const o = (orderAgg as any[])[0] || { total: [], last30: [], byStatus: [] };
  const orderStatus: Record<string, number> = {
    pending: 0, paid: 0, failed: 0, refunded: 0, cancelled: 0, partially_refunded: 0,
  };
  (o.byStatus || []).forEach((row: any) => { orderStatus[row._id] = row.count; });

  const payouts: any = { requested: 0, approved: 0, paid: 0, rejected: 0, pendingAmount: 0, paidAmount: 0 };
  (payoutAgg as any[]).forEach((p) => {
    payouts[p._id] = p.count;
    if (p._id === "requested" || p._id === "approved") payouts.pendingAmount += p.sum || 0;
    if (p._id === "paid") payouts.paidAmount = p.sum || 0;
  });

  const r = (revenueAgg as any[])[0] || { total: [], last30: [], last7: [], fees30: [] };
  const revenue = {
    total: Math.round((r.total[0]?.sum || 0) * 100) / 100,
    paidOrders: r.total[0]?.count || 0,
    last30: Math.round((r.last30[0]?.sum || 0) * 100) / 100,
    last7: Math.round((r.last7[0]?.sum || 0) * 100) / 100,
    platformFees30: Math.round((r.fees30[0]?.sum || 0) * 100) / 100,
  };

  const revMap = new Map((revenueByDay as any[]).map((x) => [x._id, x]));
  const sgnMap = new Map((signupsByDay as any[]).map((x) => [x._id, x.count]));
  const revenueChart: any[] = [];
  const signupsChart: any[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = startOfDay(daysAgo(i));
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const rev = revMap.get(key) as any;
    revenueChart.push({ date: label, revenue: rev?.revenue || 0 });
    signupsChart.push({ date: label, count: sgnMap.get(key) || 0 });
  }

  return {
    admin: admin || null,
    totals: {
      users,
      courses,
      orders: {
        total: o.total[0]?.n || 0,
        last30: o.last30[0]?.n || 0,
        byStatus: orderStatus,
      },
      revenue,
      payouts,
    },
    charts: { revenue: revenueChart, signups: signupsChart },
    recent: { users: recentUsers, orders: recentOrders, payouts: recentPayouts },
    top: { teachers: topTeachers, courses: topCourses },
  };
}

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════

const VALID_ROLES = ["student", "teacher", "admin"] as const;
const VALID_STATUSES = ["active", "banned"] as const;

export async function listUsers(query: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (query.role && VALID_ROLES.includes(query.role as any)) filter.role = query.role;
  if (query.status && VALID_STATUSES.includes(query.status as any)) filter.status = query.status;
  if (query.search?.trim()) {
    const safe = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("name email role status profileImageUrl createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    items: (items as any[]).map((u) => ({
      _id: String(u._id),
      name: u.name ?? "",
      email: u.email ?? "",
      role: u.role ?? "student",
      status: u.status ?? "active",
      avatar: u.profileImageUrl,
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function getUserById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError("Invalid user ID", 400);
  const user: any = await User.findById(id).select("-password").lean();
  if (!user) throw new AppError("User not found", 404);
  return {
    _id: String(user._id),
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role ?? "student",
    status: user.status ?? "active",
    avatar: user.profileImageUrl,
    banReason: user.banReason,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
  };
}

export async function updateUser(
  id: string,
  payload: { role?: string; status?: string; banReason?: string }
) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError("Invalid user ID", 400);

  const user: any = await User.findById(id);
  if (!user) throw new AppError("User not found", 404);

  if (payload.role) {
    if (!VALID_ROLES.includes(payload.role as any)) throw new AppError("Invalid role", 400);
    user.role = payload.role;
  }
  if (payload.status) {
    if (!VALID_STATUSES.includes(payload.status as any)) throw new AppError("Invalid status", 400);
    user.status = payload.status;
    user.banReason = payload.status === "banned" ? (payload.banReason?.trim() || "Banned by admin") : undefined;
  }
  await user.save();
  return getUserById(id);
}

export async function deleteUser(id: string, adminId: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError("Invalid user ID", 400);
  if (String(id) === String(adminId)) {
    throw new AppError("You cannot delete your own admin account", 400);
  }
  const user = await User.findByIdAndUpdate(
    id,
    { $set: { status: "banned", banReason: "Account removed by admin" } },
    { new: true }
  );
  if (!user) throw new AppError("User not found", 404);
  return { success: true };
}

export async function getStats() {
  const since30d = new Date(Date.now() - 30 * 86_400_000);
  const [
    totalUsers, totalTeachers, totalStudents, totalAdmins, bannedUsers,
    totalCourses, pendingModeration, pendingPayouts, revenueAgg, orders30d,
  ] = await Promise.all([
    User.countDocuments().catch(() => 0),
    User.countDocuments({ role: "teacher" }).catch(() => 0),
    User.countDocuments({ role: "student" }).catch(() => 0),
    User.countDocuments({ role: "admin" }).catch(() => 0),
    User.countDocuments({ status: "banned" }).catch(() => 0),
    Course.countDocuments({ deletedAt: null, status: { $ne: "archived" } }).catch(() => 0),
    Course.countDocuments({ status: "under_review", deletedAt: null }).catch(() => 0),
    TeacherPayout.countDocuments({ status: "requested" }).catch(() => 0),
    Order.aggregate([
      { $match: { status: "paid", createdAt: { $gte: since30d } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]).catch(() => [] as any[]),
    Order.countDocuments({ createdAt: { $gte: since30d } }).catch(() => 0),
  ]);
  return {
    totalUsers, totalTeachers, totalStudents, totalAdmins, bannedUsers,
    totalCourses, pendingModeration, pendingPayouts,
    revenue30d: (revenueAgg as any[])[0]?.total ?? 0,
    orders30d,
  };
}