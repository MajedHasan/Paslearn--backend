import { Types } from "mongoose";
import TeacherPayoutModel from "./teacherPayout.model";
import OrderModel from "../../order/order.model";
import { AppError } from "../../../utils/appError";

const MIN_WITHDRAW = 50;

async function computeAvailableBalance(teacherId: string) {
  const tId = new Types.ObjectId(teacherId);

  // Total earned from orders
  const earnedAgg = await OrderModel.aggregate([
    { $match: { status: "paid", "items.teacher": tId } },
    { $unwind: "$items" },
    { $match: { "items.teacher": tId } },
    {
      $lookup: {
        from: "commissions",
        localField: "items._id",
        foreignField: "orderItem",
        as: "affCommissions",
      },
    },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: "$items.finalPrice" },
        totalPlatformFee: { $sum: "$items.platformFee" },
        totalAffiliate: { $sum: { $sum: "$affCommissions.amount" } },
      },
    },
  ]);

  const earned = earnedAgg[0] || { totalPaid: 0, totalPlatformFee: 0, totalAffiliate: 0 };
  const netEarned = Math.max(
    0,
    earned.totalPaid - earned.totalPlatformFee - earned.totalAffiliate
  );

  // Already requested (pending + paid) — anything not rejected
  const payoutAgg = await TeacherPayoutModel.aggregate([
    { $match: { teacher: tId, status: { $in: ["requested", "approved", "paid"] } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const alreadyAllocated = payoutAgg[0]?.total || 0;
  const available = Math.max(0, netEarned - alreadyAllocated);

  return {
    netEarned: Math.round(netEarned * 100) / 100,
    alreadyAllocated: Math.round(alreadyAllocated * 100) / 100,
    available: Math.round(available * 100) / 100,
  };
}

export const teacherPayoutService = {
  async balance(teacherId: string) {
    return computeAvailableBalance(teacherId);
  },

  async listMine(
    teacherId: string,
    params: { status?: string; page?: number; limit?: number } = {}
  ) {
    const filter: any = { teacher: teacherId };
    if (params.status && params.status !== "all") filter.status = params.status;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 20);

    const [data, total] = await Promise.all([
      TeacherPayoutModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TeacherPayoutModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async requestPayout(
    teacherId: string,
    params: {
      amount: number;
      method: "stripe" | "paypal" | "manual";
      methodDetails?: Record<string, any>;
    }
  ) {
    if (params.amount < MIN_WITHDRAW) {
      throw new AppError(
        `Minimum withdrawal is $${MIN_WITHDRAW}. You requested $${params.amount.toFixed(2)}.`,
        400
      );
    }

    const balances = await computeAvailableBalance(teacherId);
    if (params.amount > balances.available) {
      throw new AppError(
        `Amount exceeds available balance. Available: $${balances.available.toFixed(2)}.`,
        400
      );
    }

    // Validate method details
    const d = params.methodDetails || {};
    if (params.method === "paypal") {
      if (!d.paypalEmail || !d.accountHolderName) {
        throw new AppError("PayPal email and account holder name required", 400);
      }
    } else if (params.method === "manual") {
      if (!d.accountHolderName || !d.bankName || !d.accountNumber || !d.country) {
        throw new AppError("Account holder, bank name, account number, and country required", 400);
      }
    }

    const existingPending = await TeacherPayoutModel.findOne({
      teacher: teacherId,
      status: "requested",
    });
    if (existingPending) {
      throw new AppError(
        "You already have a pending payout request. Wait for approval.",
        400
      );
    }

    const payout = await TeacherPayoutModel.create({
      teacher: teacherId,
      amount: params.amount,
      method: params.method,
      methodDetails: d,
      status: "requested",
      requestedBy: "teacher",
    });

    return payout;
  },

  // ── Admin ──
  async adminList(params: {
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const filter: any = {};
    if (params.status && params.status !== "all") filter.status = params.status;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 20);

    const [data, total] = await Promise.all([
      TeacherPayoutModel.find(filter)
        .populate("teacher", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TeacherPayoutModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async adminProcess(
    payoutId: string,
    action: "approve" | "reject" | "paid",
    reason?: string,
    externalRef?: string
  ) {
    const payout = await TeacherPayoutModel.findById(payoutId);
    if (!payout) throw new AppError("Payout not found", 404);

    if (action === "approve") {
      if (payout.status !== "requested") throw new AppError("Not in requested state", 400);
      payout.status = "approved";
      payout.processedAt = new Date();
    } else if (action === "reject") {
      if (payout.status !== "requested" && payout.status !== "approved") {
        throw new AppError("Cannot reject this payout", 400);
      }
      payout.status = "rejected";
      payout.reason = reason;
      payout.processedAt = new Date();
    } else if (action === "paid") {
      if (payout.status !== "approved") throw new AppError("Payout must be approved first", 400);
      payout.status = "paid";
      payout.externalRef = externalRef;
      payout.processedAt = new Date();
    }

    await payout.save();
    return payout;
  },

  // ⭐ Called by cron — auto-create payouts for teachers with balance ≥ MIN_WITHDRAW
  async autoCreatePayouts() {
    const teacherAgg = await OrderModel.aggregate([
      { $match: { status: "paid" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.teacher",
          totalPaid: { $sum: "$items.finalPrice" },
          totalPlatformFee: { $sum: "$items.platformFee" },
        },
      },
    ]);

    const created: Array<{ teacherId: string; amount: number }> = [];

    for (const t of teacherAgg) {
      const teacherId = String(t._id);
      const balances = await computeAvailableBalance(teacherId);

      if (balances.available < MIN_WITHDRAW) continue;

      const existingPending = await TeacherPayoutModel.findOne({
        teacher: teacherId,
        status: "requested",
      });
      if (existingPending) continue;

      // Check if we already created an "auto" payout recently for this teacher
      const recentAuto = await TeacherPayoutModel.findOne({
        teacher: teacherId,
        requestedBy: "auto",
        createdAt: { $gte: new Date(Date.now() - 20 * 86_400_000) },
      });
      if (recentAuto) continue;

      // No method details — teacher must fill them before approval
      await TeacherPayoutModel.create({
        teacher: teacherId,
        amount: balances.available,
        method: "manual", // default, admin adjusts
        status: "requested",
        requestedBy: "auto",
        methodDetails: {},
      });

      created.push({ teacherId, amount: balances.available });
    }

    return { created: created.length, teachers: created };
  },
};