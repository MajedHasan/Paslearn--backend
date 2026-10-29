import PaymentModel from "./payment.model";

export const paymentService = {
  async record(params: {
    orderId: string;
    provider: "stripe" | "paypal";
    providerRef: string;
    amount: number;
    currency: string;
    method?: string;
    rawPayload?: any;
  }) {
    return PaymentModel.findOneAndUpdate(
      { provider: params.provider, providerRef: params.providerRef },
      {
        $setOnInsert: {
          order: params.orderId,
          provider: params.provider,
          providerRef: params.providerRef,
          amount: params.amount,
          currency: params.currency,
          status: "pending",
          method: params.method,
          rawPayload: params.rawPayload,
        },
      },
      { upsert: true, new: true }
    );
  },

  async markSucceeded(providerRef: string, rawPayload?: any) {
    return PaymentModel.findOneAndUpdate(
      { providerRef },
      { status: "succeeded", rawPayload },
      { new: true }
    );
  },

  async markFailed(providerRef: string, rawPayload?: any) {
    return PaymentModel.findOneAndUpdate(
      { providerRef },
      { status: "failed", rawPayload },
      { new: true }
    );
  },

  async markRefunded(paymentId: string, refundedAmount: number) {
    const p = await PaymentModel.findById(paymentId);
    if (!p) return null;
    p.refundedAmount = (p.refundedAmount || 0) + refundedAmount;
    p.status = p.refundedAmount >= p.amount ? "refunded" : "partially_refunded";
    await p.save();
    return p;
  },

  async findByOrder(orderId: string) {
    return PaymentModel.findOne({ order: orderId, status: { $in: ["pending", "succeeded"] } });
  },

  async findByRef(providerRef: string) {
    return PaymentModel.findOne({ providerRef });
  },
};