import { CouponModel, CouponRedemptionModel } from "./coupon.model";
import { ICoupon, ICouponRedemption, RedemptionStatus } from "./coupon.interface";
import { AppError } from "../../utils/appError";
import { Types, ClientSession } from "mongoose";

export interface CartItemForCoupon {
  product: string;
  productType: "course" | "digital_file" | "coaching" | "platform_subscription" | "addon";
  refId: string;
  price: number;
  teacher?: string;   // ⬅️ NEW — needed to resolve which teacher's coupon applies
  category?: string;
  isDiscounted?: boolean;
}

export interface CouponPreview {
  coupon: ICoupon;
  applicableItems: CartItemForCoupon[];
  discountByProduct: Record<string, number>;
  discountTotal: number;
  subtotal: number;
  finalSubtotal: number;
}

const PRODUCT_TYPE_TO_CATEGORY: Record<string, "courses" | "digital" | "coaching"> = {
  course: "courses",
  digital_file: "digital",
  coaching: "coaching",
};

function isCouponWindowOpen(coupon: ICoupon, now = new Date()): { open: boolean; reason?: string } {
  if (coupon.deletedAt) return { open: false, reason: "Coupon not found" };
  if (coupon.status === "disabled") return { open: false, reason: "Coupon is disabled" };
  if (coupon.status === "expired") return { open: false, reason: "Coupon has expired" };
  if (now < coupon.startDate) return { open: false, reason: "Coupon not yet active" };
  if (now > coupon.endDate) return { open: false, reason: "Coupon has expired" };
  return { open: true };
}

/**
 * ⭐ NEW — find all candidate coupons for a given code the cart could use.
 * Admin coupons are always eligible. Teacher coupons only if that teacher
 * has at least one item in the cart.
 */
async function findApplicableCoupons(code: string, items: CartItemForCoupon[]): Promise<ICoupon[]> {
  const teacherIdsInCart = Array.from(
    new Set(items.map((i) => i.teacher).filter(Boolean).map(String))
  );

  const candidates = await CouponModel.find({
    code: code.toUpperCase(),
    deletedAt: null,
    $or: [
      { ownerType: "admin" },
      { ownerType: "teacher", ownerId: { $in: teacherIdsInCart } },
    ],
  });

  return candidates;
}

function scorePreview(p: CouponPreview): number {
  // Prefer higher discount; tie-break: admin > teacher
  return p.discountTotal * 100 + (p.coupon.ownerType === "admin" ? 1 : 0);
}

export const couponService = {
  /**
   * ⭐ NEW — resolve the best applicable coupon for a code + cart.
   * Returns { valid, preview?, reason? }. Runs full validation across
   * every candidate and picks the winner.
   */
  async resolve(params: {
    userId?: string;
    code: string;
    items: CartItemForCoupon[];
    currency: string;
    country?: string;
    hasPriorPurchases?: boolean;
  }): Promise<{ valid: boolean; reason?: string; preview?: CouponPreview }> {
    const candidates = await findApplicableCoupons(params.code, params.items);
    if (candidates.length === 0) {
      return { valid: false, reason: "Invalid coupon code" };
    }

    const results: CouponPreview[] = [];
    let lastReason: string | undefined;

    for (const coupon of candidates) {
      const result = await this.validateSingle(coupon, params);
      if (result.valid && result.preview) {
        results.push(result.preview);
      } else {
        lastReason = result.reason;
      }
    }

    if (results.length === 0) {
      return { valid: false, reason: lastReason || "Coupon not applicable" };
    }

    // Best discount wins
    results.sort((a, b) => scorePreview(b) - scorePreview(a));
    return { valid: true, preview: results[0] };
  },

  /**
   * Validate a specific coupon (internal — most callers should use resolve()).
   */
  async validateSingle(
    coupon: ICoupon,
    params: { userId?: string; items: CartItemForCoupon[]; currency: string; country?: string; hasPriorPurchases?: boolean }
  ): Promise<{ valid: boolean; reason?: string; preview?: CouponPreview }> {
    const window = isCouponWindowOpen(coupon);
    if (!window.open) return { valid: false, reason: window.reason };

    if (coupon.currency !== params.currency.toUpperCase()) {
      return { valid: false, reason: `Coupon is for ${coupon.currency}` };
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, reason: "Coupon usage limit reached" };
    }
    if (!(await this.checkUserUsage(coupon, params.userId)).ok) {
      return { valid: false, reason: "Coupon usage limit reached for your account" };
    }
    if (coupon.firstPurchaseOnly && params.hasPriorPurchases) {
      return { valid: false, reason: "Coupon is valid for first purchase only" };
    }
    if (coupon.targetUsers.mode === "selected") {
      if (!params.userId || !coupon.targetUsers.userIds.map(String).includes(String(params.userId))) {
        return { valid: false, reason: "Coupon not available for your account" };
      }
    }
    if (coupon.countries?.length && !coupon.countries.includes((params.country || "").toUpperCase())) {
      return { valid: false, reason: "Coupon not valid in your country" };
    }

    // Teacher coupon: only apply to that teacher's items
    const ownerFiltered = coupon.ownerType === "teacher"
      ? params.items.filter((i) => String(i.teacher) === String(coupon.ownerId))
      : params.items;

    if (ownerFiltered.length === 0) {
      return { valid: false, reason: "Coupon does not apply to items in your cart" };
    }

    const subtotal = ownerFiltered.reduce((a, i) => a + i.price, 0);
    if (coupon.minSpend && subtotal < coupon.minSpend) {
      return { valid: false, reason: `Minimum spend of ${coupon.minSpend} ${coupon.currency} required` };
    }

    let applicable = ownerFiltered.filter((i) => {
      const cat = PRODUCT_TYPE_TO_CATEGORY[i.productType];
      if (!cat || !coupon.appliesTo.items.includes(cat)) return false;
      if (coupon.appliesTo.mode === "selected") {
        return coupon.appliesTo.selectedIds.some((sid) =>
          sid === String(i.product) || sid === String(i.refId)
        );
      }
      if (coupon.appliesTo.mode === "category") {
        return !!i.category && coupon.appliesTo.categories.includes(i.category);
      }
      return true;
    });
    if (coupon.excludeDiscountedItems) applicable = applicable.filter((i) => !i.isDiscounted);
    if (applicable.length === 0) {
      return { valid: false, reason: "Coupon does not apply to any item in your cart" };
    }

    const applicableSubtotal = applicable.reduce((a, i) => a + i.price, 0);
    let rawDiscount = 0;

    if (coupon.type === "percentage") {
      rawDiscount = (applicableSubtotal * coupon.value) / 100;
      if (coupon.maxDiscount && rawDiscount > coupon.maxDiscount) rawDiscount = coupon.maxDiscount;
    } else if (coupon.type === "fixed") {
      rawDiscount = Math.min(coupon.value, applicableSubtotal);
    } else if (coupon.type === "free") {
      rawDiscount = applicableSubtotal;
    } else if (coupon.type === "bogo") {
      if (applicable.length < 2) return { valid: false, reason: "BOGO requires 2+ items" };
      rawDiscount = [...applicable].sort((a, b) => a.price - b.price)[0].price;
    } else if (coupon.type === "free_shipping") {
      return { valid: false, reason: "Free shipping not applicable to digital products" };
    }

    const discountByProduct: Record<string, number> = {};
    let remaining = rawDiscount;
    applicable.forEach((item, idx) => {
      const isLast = idx === applicable.length - 1;
      const share = isLast
        ? Math.min(remaining, item.price)
        : Math.min((item.price / applicableSubtotal) * rawDiscount, item.price);
      discountByProduct[String(item.product)] = Math.round(share * 100) / 100;
      remaining -= share;
    });

    const discountTotal = Object.values(discountByProduct).reduce((a, b) => a + b, 0);
    const allSubtotal = params.items.reduce((a, i) => a + i.price, 0);

    return {
      valid: true,
      preview: {
        coupon,
        applicableItems: applicable,
        discountByProduct,
        discountTotal: Math.round(discountTotal * 100) / 100,
        subtotal: allSubtotal,
        finalSubtotal: Math.max(0, Math.round((allSubtotal - discountTotal) * 100) / 100),
      },
    };
  },

  async checkUserUsage(coupon: ICoupon, userId?: string): Promise<{ ok: boolean; reason?: string }> {
    if (!coupon.perUserLimit || coupon.perUserLimit === 0) return { ok: true };
    if (!userId) return { ok: false, reason: "Login required to use this coupon" };
    const count = await CouponRedemptionModel.countDocuments({
      coupon: coupon._id, user: userId, status: { $in: ["reserved", "committed"] },
    });
    return count >= coupon.perUserLimit
      ? { ok: false, reason: "Coupon usage limit reached for your account" }
      : { ok: true };
  },

  async findByIdOrFail(id: string) {
    const c = await CouponModel.findOne({ _id: id, deletedAt: null });
    if (!c) throw new AppError("Coupon not found", 404);
    return c;
  },

  async reserve(
    couponId: string,
    userId: string,
    orderId: string,
    preview: CouponPreview,
    session?: ClientSession
  ): Promise<ICouponRedemption> {
    // Need user email + product titles for snapshots
    const { default: UserModel } = await import("../../models/user.model");
    const { default: ProductModel } = await import("../product/product.model");
    const { default: OrderModel } = await import("../order/order.model");

    const [user, order] = await Promise.all([
      UserModel.findById(userId).select("email").lean(),
      OrderModel.findById(orderId).select("orderNumber").lean(),
    ]);

    const productIds = preview.applicableItems.map((i) => i.product);
    const products = await ProductModel.find({ _id: { $in: productIds } })
      .select("title teacherId")
      .lean();
    const productMap = new Map(products.map((p: any) => [String(p._id), p]));

    await CouponModel.updateOne({ _id: couponId }, { $inc: { usedCount: 1 } }, { session });

    const [redemption] = await CouponRedemptionModel.create([{
      coupon: couponId,
      couponCode: preview.coupon.code,
      user: userId,
      userEmail: (user as any)?.email || "unknown@example.com",
      order: orderId,
      orderNumber: (order as any)?.orderNumber,
      discountAmount: preview.discountTotal,
      currency: preview.coupon.currency,
      items: preview.applicableItems.map((i) => {
        const p: any = productMap.get(String(i.product));
        return {
          product: i.product,
          productType: i.productType,
          refId: i.refId,
          teacher: p?.teacherId || i.teacher,
          productTitle: p?.title || "Unknown product",
          originalPrice: i.price,
          discountApplied: preview.discountByProduct[String(i.product)] || 0,
        };
      }),
      status: "reserved",
    }], { session });

    return redemption;
  },

  async commit(orderId: string, session?: ClientSession) {
    return CouponRedemptionModel.updateMany(
      { order: orderId, status: "reserved" },
      { $set: { status: "committed", committedAt: new Date() } },
      { session }
    );
  },

  async reverse(orderId: string, session?: ClientSession) {
    const redemptions = await CouponRedemptionModel.find({
      order: orderId,
      status: { $in: ["reserved", "committed"] },
    }).session(session ?? null);

    for (const r of redemptions) {
      await CouponModel.updateOne({ _id: r.coupon }, { $inc: { usedCount: -1 } }, { session });
      r.status = "reversed";
      r.reversedAt = new Date();
      await r.save({ session });
    }
    return redemptions.length;
  },

  // ─── Admin / teacher CRUD helpers ───
  async createForOwner(payload: any, ownerType: "admin" | "teacher", ownerId?: string) {
    try {
      return await CouponModel.create({
        ...payload,
        ownerType,
        ownerId: ownerType === "teacher" ? ownerId : null,
        code: String(payload.code || "").toUpperCase(),
      });
    } catch (err: any) {
      if (err.code === 11000) {
        throw new AppError(
          ownerType === "admin"
            ? "An admin coupon with this code already exists"
            : "You already have a coupon with this code",
          409
        );
      }
      throw err;
    }
  },

  async softDelete(id: string) {
    const doc = await CouponModel.findById(id);
    if (!doc) throw new AppError("Coupon not found", 404);
    // Rename code so it can be re-used without unique-index collision
    doc.code = `${doc.code}-DELETED-${doc._id}`;
    doc.status = "disabled";
    doc.deletedAt = new Date();
    await doc.save();
    return doc;
  },




  // ─── Admin / teacher listing helpers ───
  // ════════════════════════════════════════════════════════════════
  // Redemption queries — teachers see their own; admins see everything
  // ════════════════════════════════════════════════════════════════

  async listRedemptions(params: {
    scope: "admin" | "teacher";
    teacherId?: string;
    couponId?: string;
    status?: RedemptionStatus;
    courseId?: string;
    from?: Date;
    to?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const filter: any = {};
    if (params.scope === "teacher") filter["items.teacher"] = new Types.ObjectId(params.teacherId);
    if (params.couponId) filter.coupon = new Types.ObjectId(params.couponId);
    if (params.status) filter.status = params.status;
    if (params.courseId) filter["items.refId"] = new Types.ObjectId(params.courseId);
    if (params.from || params.to) {
      filter.createdAt = {};
      if (params.from) filter.createdAt.$gte = params.from;
      if (params.to) filter.createdAt.$lte = params.to;
    }
    if (params.search) {
      filter.$or = [
        { couponCode: { $regex: params.search, $options: "i" } },
        { userEmail: { $regex: params.search, $options: "i" } },
        { orderNumber: { $regex: params.search, $options: "i" } },
      ];
    }

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, params.limit || 20);

    const [data, total] = await Promise.all([
      CouponRedemptionModel.find(filter)
        .populate("user", "name email")
        .populate("order", "orderNumber status total")
        .populate("coupon", "code type value ownerType")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CouponRedemptionModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async redemptionStats(params: {
    scope: "admin" | "teacher";
    teacherId?: string;
    couponId?: string;
    from?: Date;
    to?: Date;
  }) {
    const match: any = {};
    if (params.scope === "teacher") match["items.teacher"] = new Types.ObjectId(params.teacherId);
    if (params.couponId) match.coupon = new Types.ObjectId(params.couponId);
    if (params.from || params.to) {
      match.createdAt = {};
      if (params.from) match.createdAt.$gte = params.from;
      if (params.to) match.createdAt.$lte = params.to;
    }

    const [aggregate, statusCounts, topCoupons] = await Promise.all([
      CouponRedemptionModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalRedemptions: { $sum: 1 },
            totalDiscount: { $sum: "$discountAmount" },
            uniqueUsers: { $addToSet: "$user" },
          },
        },
      ]),
      CouponRedemptionModel.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      CouponRedemptionModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$couponCode",
            count: { $sum: 1 },
            discount: { $sum: "$discountAmount" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const s = aggregate[0] || { totalRedemptions: 0, totalDiscount: 0, uniqueUsers: [] };
    const statusMap: Record<string, number> = { reserved: 0, committed: 0, reversed: 0 };
    statusCounts.forEach((row: any) => { statusMap[row._id] = row.count; });

    return {
      totalRedemptions: s.totalRedemptions,
      totalDiscountGiven: Math.round(s.totalDiscount * 100) / 100,
      uniqueUsers: s.uniqueUsers.length,
      byStatus: statusMap,
      topCoupons: topCoupons.map((c: any) => ({
        code: c._id,
        redemptions: c.count,
        discountGiven: Math.round(c.discount * 100) / 100,
      })),
    };
  },

};