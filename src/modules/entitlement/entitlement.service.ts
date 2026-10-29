// src/modules/entitlement/entitlement.service.ts
import EntitlementModel from "./entitlement.model";
import { IEntitlement } from "./entitlement.interface";
import { Types } from "mongoose";

export const entitlementService = {
  /**
   * Grant (or revive) access to a product for a user.
   * Idempotent — safe to call from webhook retries.
   */
  async grant(params: {
    userId: string | Types.ObjectId;
    productId: string | Types.ObjectId;
    productType: IEntitlement["productType"];
    refId: string | Types.ObjectId;
    teacherId: string | Types.ObjectId;
    source: IEntitlement["source"];
    orderItemId?: string | Types.ObjectId;
    expiresAt?: Date | null;
    providerSubscriptionId?: string;
    autoRenew?: boolean;
  }): Promise<IEntitlement> {
    const existing = await EntitlementModel.findOne({
      user: params.userId,
      product: params.productId,
    });

    if (existing) {
      // Revive / extend
      existing.status = "active";
      existing.revokedAt = null;
      existing.expiresAt = params.expiresAt ?? existing.expiresAt ?? null;
      if (params.providerSubscriptionId) existing.providerSubscriptionId = params.providerSubscriptionId;
      if (params.autoRenew !== undefined) existing.autoRenew = params.autoRenew;
      await existing.save();
      return existing;
    }

    return EntitlementModel.create({
      user: params.userId,
      product: params.productId,
      productType: params.productType,
      refId: params.refId,
      teacher: params.teacherId,
      source: params.source,
      orderItemId: params.orderItemId,
      expiresAt: params.expiresAt ?? null,
      providerSubscriptionId: params.providerSubscriptionId,
      autoRenew: params.autoRenew ?? false,
      status: "active",
      grantedAt: new Date(),
    });
  },

  /**
   * Fast access check. Returns the active entitlement or null.
   */
  async check(userId: string | Types.ObjectId, productId: string | Types.ObjectId) {
    const now = new Date();
    return EntitlementModel.findOne({
      user: userId,
      product: productId,
      status: "active",
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    });
  },

  /**
   * Faster check when we have refId + type (playback endpoint).
   */
  async checkByRef(
    userId: string | Types.ObjectId,
    productType: IEntitlement["productType"],
    refId: string | Types.ObjectId
  ) {
    const now = new Date();
    return EntitlementModel.findOne({
      user: userId,
      productType,
      refId,
      status: "active",
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    });
  },

  async revoke(entitlementId: string, reason?: string) {
    return EntitlementModel.findByIdAndUpdate(
      entitlementId,
      { status: "revoked", revokedAt: new Date() },
      { new: true }
    );
  },

  async expirePastDue() {
    return EntitlementModel.updateMany(
      { status: "active", expiresAt: { $ne: null, $lte: new Date() } },
      { $set: { status: "expired" } }
    );
  },
};