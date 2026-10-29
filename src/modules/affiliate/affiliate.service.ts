import { AffiliateProfileModel, CommissionModel } from "./affiliate.model";
import { ICommissionPolicy } from "../product/product.interface";
import { Types } from "mongoose";

export const affiliateService = {
  async findByCode(code: string) {
    return AffiliateProfileModel.findOne({ referralCode: code, status: "active" });
  },

  async recordCommission(params: {
    affiliateCode: string;
    order: string | Types.ObjectId;
    orderItemId: string | Types.ObjectId;
    product: string | Types.ObjectId;
    teacher: string | Types.ObjectId;
    policy: ICommissionPolicy;
    basePrice: number;
    currency: string;
  }) {
    const profile = await this.findByCode(params.affiliateCode);
    if (!profile) return null;

    const amount =
      params.policy.valueType === "percent"
        ? Math.round((params.basePrice * params.policy.value) / 100 * 100) / 100
        : Math.min(params.policy.value, params.basePrice);

    if (amount <= 0) return null;

    const commission = await CommissionModel.create({
      affiliate: profile.user,
      affiliateCode: params.affiliateCode,
      product: params.product,
      order: params.order,
      orderItem: params.orderItemId,
      teacher: params.teacher,
      type: params.policy.type,
      valueType: params.policy.valueType,
      value: params.policy.value,
      amount,
      currency: params.currency,
      periodStart: new Date(),
      occurrenceNumber: 1,
      isFinal: params.policy.type === "one_time" ||
        (params.policy.duration === "fixed_months" && (params.policy.durationMonths || 1) <= 1),
      status: "pending",
    });

    await AffiliateProfileModel.updateOne(
      { _id: profile._id },
      { $inc: { totalEarned: amount, totalPending: amount } }
    );

    return commission;
  },

  async reverseForOrder(orderId: string | Types.ObjectId) {
    const commissions = await CommissionModel.find({ order: orderId, status: { $in: ["pending", "approved"] } });
    for (const c of commissions) {
      c.status = "reversed";
      await c.save();
      await AffiliateProfileModel.updateOne(
        { user: c.affiliate },
        { $inc: { totalPending: -c.amount, totalEarned: -c.amount } }
      );
    }
    return commissions.length;
  },
};