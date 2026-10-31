export interface PaymentAdapterInput {
  order: any;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface PaymentResult {
  providerRef: string;
  clientSecret?: string;   // Stripe Elements
  approvalUrl?: string;    // PayPal redirect / Stripe Checkout
  subscriptionId?: string;
}

export type ParsedEventType =
  | "payment.succeeded"
  | "payment.failed"
  | "subscription.renewed"
  | "subscription.cancelled"
  | "refund.created"
  | "ignored";

export interface ParsedPaymentEvent {
  eventType: ParsedEventType;
  orderId?: string;
  paymentRef?: string;
  subscriptionId?: string;
  amount?: number;
  currency?: string;
  raw: any;
}

export interface PaymentProvider {
  name: "stripe" | "paypal";
  createOneTimePayment(input: PaymentAdapterInput): Promise<PaymentResult>;
  createSubscription(input: PaymentAdapterInput): Promise<PaymentResult>;
  refund(paymentRef: string, amount: number): Promise<{ refundRef: string; status: string }>;
  verifyWebhook(headers: Record<string, any>, rawBody: Buffer | string): Promise<ParsedPaymentEvent>;
  retrievePaymentStatus( providerRef: string ): Promise<"succeeded" | "pending" | "failed" | "unknown">;
}