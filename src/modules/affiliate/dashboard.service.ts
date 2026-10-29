import { AffiliateProfileModel, CommissionModel } from "./affiliate.model";
import OrderModel from "../order/order.model";
import { AppError } from "../../utils/appError";
import { Types } from "mongoose";

async function ensureProfile(userId: string) {
  let profile = await AffiliateProfileModel.findOne({ user: userId });
  if (!profile) {
    profile = await AffiliateProfileModel.create({
      user: userId,
      referralCode: "REF" + userId.slice(-8).toUpperCase(),
    });
  }
  return profile;
}

export const affiliateDashboardService = {
  async overview(userId: string) {
    const profile = await ensureProfile(userId);
    const days = 180;
    const since = new Date(Date.now() - days * 86_400_000);
    const uId = new Types.ObjectId(userId);

    const [monthly, byProgram] = await Promise.all([
      CommissionModel.aggregate([
        { $match: { affiliate: uId, createdAt: { $gte: since }, status: { $ne: "reversed" } } },
        { $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          earnings: { $sum: "$amount" }, count: { $sum: 1 },
        } },
        { $sort: { _id: 1 } },
      ]),
      CommissionModel.aggregate([
        { $match: { affiliate: uId, status: { $ne: "reversed" } } },
        { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "prod" } },
        { $unwind: { path: "$prod", preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: "$prod.type",
          totalEarned: { $sum: "$amount" },
          count: { $sum: 1 },
        } },
      ]),
    ]);

    const programOrder = ["platform_subscription", "course", "digital_file", "coaching", "addon"];
    const byProgramMap: Record<string, any> = {};
    for (const p of programOrder) byProgramMap[p] = { totalEarned: 0, count: 0 };
    byProgram.forEach((p: any) => {
      byProgramMap[p._id || "unknown"] = { totalEarned: p.totalEarned, count: p.count };
    });

    return {
      profile: {
        referralCode: profile.referralCode,
        referralLink: `${process.env.PUBLIC_APP_URL || "https://paslearn.com"}/ref/${profile.referralCode}`,
        status: profile.status,
        totalEarned: profile.totalEarned,
        totalPending: profile.totalPending,
        totalPaid: profile.totalPaid,
      },
      monthlyEarnings: monthly.map((m: any) => ({ month: m._id, earnings: m.earnings, count: m.count })),
      byProgram: byProgramMap,
    };
  },

  async referrals(userId: string, params: { status?: string; page?: number; limit?: number } = {}) {
    const filter: any = { affiliate: userId };
    if (params.status && params.status !== "all") filter.status = params.status;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 20);

    const [data, total] = await Promise.all([
      CommissionModel.find(filter)
        .populate("order", "orderNumber total createdAt status")
        .populate("product", "title type")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CommissionModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async requestPayout(userId: string, params: { method: "stripe" | "paypal" | "manual"; amount: number }) {
    const profile = await ensureProfile(userId);
    if (params.amount <= 0) throw new AppError("Amount must be positive", 400);
    if (params.amount > profile.totalPending) throw new AppError("Amount exceeds pending balance", 400);
    // Minimums per method
    const mins = { stripe: 50, paypal: 50, manual: 100 };
    if (params.amount < mins[params.method]) {
      throw new AppError(`Minimum withdrawal for ${params.method} is $${mins[params.method]}`, 400);
    }
    // Create payout record (see PayoutModel below)
    const { PayoutModel } = await import("./payout.model");
    const payout = await PayoutModel.create({
      affiliate: userId,
      method: params.method,
      amount: params.amount,
      status: "requested",
    });
    // TODO: process via Stripe Connect / PayPal payouts on admin approval
    return payout;
  },

  async adminApprovePayout(payoutId: string, approved: boolean, reason?: string) {
    const { PayoutModel } = await import("./payout.model");
    const payout = await PayoutModel.findById(payoutId);
    if (!payout) throw new AppError("Payout not found", 404);
    if (payout.status !== "requested") throw new AppError("Payout already processed", 400);

    if (!approved) {
      payout.status = "rejected";
      payout.reason = reason;
      await payout.save();
      return payout;
    }

    // Mark related commissions as paid (FIFO by createdAt)
    const commissions = await CommissionModel.find({
      affiliate: payout.affiliate,
      status: { $in: ["pending", "approved"] },
    }).sort({ createdAt: 1 });

    let remaining = payout.amount;
    for (const c of commissions) {
      if (remaining <= 0) break;
      c.status = "paid";
      c.paidAt = new Date();
      await c.save();
      remaining -= c.amount;
    }

    await AffiliateProfileModel.updateOne(
      { user: payout.affiliate },
      { $inc: { totalPending: -payout.amount, totalPaid: payout.amount } }
    );

    payout.status = "paid";
    payout.processedAt = new Date();
    await payout.save();
    return payout;
  },
};