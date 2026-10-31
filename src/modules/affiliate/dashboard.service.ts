import { AffiliateProfileModel, CommissionModel } from "./affiliate.model";
import OrderModel from "../order/order.model";
import { AppError } from "../../utils/appError";
import { Types } from "mongoose";

const HOLD_DAYS = parseInt(process.env.AFFILIATE_HOLD_DAYS || "7");
const HOLD_MS = HOLD_DAYS * 86_400_000;

// ⭐ Friendly 8-char code — no confusing chars
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function ensureProfile(userId: string) {
  let profile = await AffiliateProfileModel.findOne({ user: userId });
  if (profile) return profile;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      profile = await AffiliateProfileModel.create({
        user: userId,
        referralCode: generateReferralCode(),
        status: "active",
        totalEarned: 0,
        totalPending: 0,
        totalAvailable: 0,
        totalPaid: 0,
      });
      return profile;
    } catch (err: any) {
      if (err?.code !== 11000 || attempt === 2) throw err;
    }
  }
  throw new AppError("Failed to create affiliate profile", 500);
}

// ⭐ Promote pending commissions past hold period to approved
async function promoteExpiredCommissions(userId: string) {
  const now = new Date();
  const legacyCutoff = new Date(now.getTime() - HOLD_MS);

  const toPromote = await CommissionModel.find({
    affiliate: userId,
    status: "pending",
    $or: [
      { holdUntil: { $lte: now } },
      { holdUntil: { $exists: false }, createdAt: { $lte: legacyCutoff } },
    ],
  });

  if (toPromote.length === 0) return 0;

  let total = 0;
  for (const c of toPromote) {
    c.status = "approved";
    await c.save();
    total += c.amount;
  }

  await AffiliateProfileModel.updateOne(
    { user: userId },
    { $inc: { totalPending: -total, totalAvailable: total } }
  );

  return total;
}

// ⭐ Recompute all balances fresh from commissions collection
async function computeBalances(userId: string) {
  const uId = new Types.ObjectId(userId);
  const [facetResult] = await CommissionModel.aggregate([
    { $match: { affiliate: uId, status: { $ne: "reversed" } } },
    {
      $facet: {
        byStatus: [
          {
            $group: {
              _id: "$status",
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
        ],
        total: [{ $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }],
      },
    },
  ]);

  const byStatus = facetResult?.byStatus || [];
  const total = facetResult?.total || [];

  const map: Record<string, { total: number; count: number }> = {};
  for (const row of byStatus) map[row._id] = { total: row.total, count: row.count };

  return {
    totalEarned: total[0]?.total || 0,
    totalPending: map.pending?.total || 0,
    totalAvailable: map.approved?.total || 0,
    totalPaid: map.paid?.total || 0,
    totalCount: total[0]?.count || 0,
  };
}

export const affiliateDashboardService = {
  async overview(userId: string) {
    const profile = await ensureProfile(userId);

    // ⭐ Promote first, then compute
    await promoteExpiredCommissions(userId);
    const balances = await computeBalances(userId);

    // Sync profile counters (self-healing)
    await AffiliateProfileModel.updateOne(
      { user: userId },
      {
        $set: {
          totalEarned: balances.totalEarned,
          totalPending: balances.totalPending,
          totalAvailable: balances.totalAvailable,
          totalPaid: balances.totalPaid,
        },
      }
    );

    const days = 180;
    const since = new Date(Date.now() - days * 86_400_000);
    const uId = new Types.ObjectId(userId);

    const [monthly, byProgram] = await Promise.all([
      CommissionModel.aggregate([
        { $match: { affiliate: uId, createdAt: { $gte: since }, status: { $ne: "reversed" } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            earnings: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      CommissionModel.aggregate([
        { $match: { affiliate: uId, status: { $ne: "reversed" } } },
        {
          $lookup: {
            from: "products",
            localField: "product",
            foreignField: "_id",
            as: "prod",
          },
        },
        { $unwind: { path: "$prod", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$prod.type",
            totalEarned: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const programOrder = ["platform_subscription", "course", "digital_file", "coaching", "addon"];
    const byProgramMap: Record<string, any> = {};
    for (const p of programOrder) byProgramMap[p] = { totalEarned: 0, count: 0 };
    byProgram.forEach((p: any) => {
      byProgramMap[p._id || "unknown"] = { totalEarned: p.totalEarned, count: p.count };
    });

    const appUrl = process.env.PUBLIC_APP_URL || "https://paslearn.com";

    return {
      profile: {
        referralCode: profile.referralCode,
        referralLink: `${appUrl}/?ref=${profile.referralCode}`,
        status: profile.status,
        totalEarned: balances.totalEarned,
        totalPending: balances.totalPending,
        totalAvailable: balances.totalAvailable,
        totalPaid: balances.totalPaid,
        conversions: balances.totalCount,
        holdDays: HOLD_DAYS,
      },
      monthlyEarnings: monthly.map((m: any) => ({
        month: m._id,
        earnings: m.earnings,
        count: m.count,
      })),
      byProgram: byProgramMap,
    };
  },

  async referrals(
    userId: string,
    params: { status?: string; page?: number; limit?: number } = {}
  ) {
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

  async listPayouts(
    userId: string,
    params: { status?: string; page?: number; limit?: number } = {}
  ) {
    const { PayoutModel } = await import("./payout.model");
    const filter: any = { affiliate: userId };
    if (params.status && params.status !== "all") filter.status = params.status;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 20);

    const [data, total] = await Promise.all([
      PayoutModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PayoutModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async requestPayout(
    userId: string,
    params: {
      method: "stripe" | "paypal" | "manual";
      amount: number;
      methodDetails: Record<string, any>;
    }
  ) {
    await ensureProfile(userId);

    // ⭐ Promote first, then check available balance
    await promoteExpiredCommissions(userId);
    const balances = await computeBalances(userId);

    if (params.amount <= 0) throw new AppError("Amount must be positive", 400);
    if (params.amount > balances.totalAvailable) {
      throw new AppError(
        `Amount exceeds available balance. Available: $${balances.totalAvailable.toFixed(
          2
        )}. Pending commissions still in escrow: $${balances.totalPending.toFixed(2)}.`,
        400
      );
    }

    const mins = { stripe: 50, paypal: 50, manual: 100 };
    if (params.amount < mins[params.method]) {
      throw new AppError(
        `Minimum withdrawal for ${params.method} is $${mins[params.method]}`,
        400
      );
    }

    // ⭐ Validate method details
    const details = params.methodDetails || {};
    if (params.method === "paypal") {
      if (!details.paypalEmail) {
        throw new AppError("PayPal email is required", 400);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.paypalEmail)) {
        throw new AppError("Invalid PayPal email format", 400);
      }
      if (!details.accountHolderName) {
        throw new AppError("Account holder name is required", 400);
      }
    } else if (params.method === "manual") {
      // Bank transfer
      if (!details.accountHolderName) {
        throw new AppError("Account holder name is required", 400);
      }
      if (!details.bankName) {
        throw new AppError("Bank name is required", 400);
      }
      if (!details.accountNumber) {
        throw new AppError("IBAN or account number is required", 400);
      }
      if (!details.country) {
        throw new AppError("Country is required", 400);
      }
    }

    const { PayoutModel } = await import("./payout.model");

    // Prevent duplicate pending requests
    const existingPending = await PayoutModel.findOne({
      affiliate: userId,
      status: "requested",
    });
    if (existingPending) {
      throw new AppError(
        "You already have a pending withdrawal request. Please wait for approval.",
        400
      );
    }

    const payout = await PayoutModel.create({
      affiliate: userId,
      method: params.method,
      amount: params.amount,
      status: "requested",
      methodDetails: details,
    });

    return payout;
  },

  async adminApprovePayout(payoutId: string, approved: boolean, reason?: string) {
    const { PayoutModel } = await import("./payout.model");
    const payout = await PayoutModel.findById(payoutId);
    if (!payout) throw new AppError("Payout not found", 404);
    if (payout.status !== "requested")
      throw new AppError("Payout already processed", 400);

    if (!approved) {
      payout.status = "rejected";
      payout.reason = reason;
      await payout.save();
      return payout;
    }

    // ⭐ Only mark APPROVED commissions as paid (not pending — those are in escrow)
    const commissions = await CommissionModel.find({
      affiliate: payout.affiliate,
      status: "approved",
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
      { $inc: { totalAvailable: -payout.amount, totalPaid: payout.amount } }
    );

    payout.status = "paid";
    payout.processedAt = new Date();
    await payout.save();
    return payout;
  },

  // ⭐ Global promotion for cron
  async promoteAllExpired() {
    const now = new Date();
    const legacyCutoff = new Date(now.getTime() - HOLD_MS);

    const toPromote = await CommissionModel.find({
      status: "pending",
      $or: [
        { holdUntil: { $lte: now } },
        { holdUntil: { $exists: false }, createdAt: { $lte: legacyCutoff } },
      ],
    });

    if (toPromote.length === 0) return { promoted: 0, affiliates: 0 };

    const byAffiliate = new Map<string, number>();
    for (const c of toPromote) {
      c.status = "approved";
      await c.save();
      const key = String(c.affiliate);
      byAffiliate.set(key, (byAffiliate.get(key) || 0) + c.amount);
    }

    for (const [affiliateId, amount] of byAffiliate) {
      await AffiliateProfileModel.updateOne(
        { user: affiliateId },
        { $inc: { totalPending: -amount, totalAvailable: amount } }
      );
    }

    return { promoted: toPromote.length, affiliates: byAffiliate.size };
  },
};