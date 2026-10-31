import axios from "axios";
import { PaymentProvider, PaymentAdapterInput, PaymentResult, ParsedPaymentEvent } from "./provider.interface";
import { AppError } from "../../utils/appError";

const PAYPAL_API = process.env.PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new AppError("PayPal credentials not configured", 500);

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const { data } = await axios.post(
    `${PAYPAL_API}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return data.access_token;
}

export class PayPalProvider implements PaymentProvider {
  name = "paypal" as const;

  async createOneTimePayment(input: PaymentAdapterInput): Promise<PaymentResult> {
    const token = await getAccessToken();
    const { data } = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: String(input.order._id),
          amount: {
            currency_code: input.order.currency,
            value: input.order.total.toFixed(2),
          },
          description: `Order ${input.order.orderNumber}`,
        }],
        application_context: {
          brand_name: "Paslearn",
          return_url: input.successUrl,
          cancel_url: input.cancelUrl,
        },
      },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    const approval = data.links.find((l: any) => l.rel === "approve")?.href;
    return { providerRef: data.id, approvalUrl: approval };
  }

  async createSubscription(_input: PaymentAdapterInput): Promise<PaymentResult> {
    // PayPal subscriptions require pre-configured Plan IDs in PayPal dashboard.
    throw new AppError(
      "PayPal subscription is not configured. Please configure a plan in PayPal and set PAYPAL_PLAN_ID.",
      501
    );
  }

  async refund(paymentRef: string, amount: number) {
    // paymentRef here is the capture ID; must be provided by caller
    const token = await getAccessToken();
    // Requires capture ID stored on Payment record — PayPal refunds by capture ID
    const { data } = await axios.post(
      `${PAYPAL_API}/v2/payments/captures/${paymentRef}/refund`,
      { amount: { value: amount.toFixed(2), currency_code: "USD" } },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    return { refundRef: data.id, status: data.status };
  }

  async verifyWebhook(headers: Record<string, any>, rawBody: Buffer | string): Promise<ParsedPaymentEvent> {
    const token = await getAccessToken();
    const body = typeof rawBody === "string" ? JSON.parse(rawBody) : JSON.parse(rawBody.toString());

    // Verify signature with PayPal
    const verifyRes = await axios.post(
      `${PAYPAL_API}/v1/notifications/verify-webhook-signature`,
      {
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: body,
      },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    if (verifyRes.data.verification_status !== "SUCCESS") {
      throw new AppError("PayPal webhook signature verification failed", 400);
    }

    if (body.event_type === "CHECKOUT.ORDER.APPROVED") {
      // Capture the order
      const orderId = body.resource.id;
      const captureRes = await axios.post(
        `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
        {},
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      const pu = captureRes.data.purchase_units?.[0];
      const captureId = pu?.payments?.captures?.[0]?.id;
      return {
        eventType: "payment.succeeded",
        orderId: pu?.reference_id,
        paymentRef: captureId,
        amount: parseFloat(pu?.payments?.captures?.[0]?.amount?.value || "0"),
        currency: pu?.payments?.captures?.[0]?.amount?.currency_code || "USD",
        raw: captureRes.data,
      };
    }

    if (body.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      return {
        eventType: "payment.succeeded",
        orderId: body.resource.purchase_units?.[0]?.reference_id,
        paymentRef: body.resource.id,
        amount: parseFloat(body.resource.amount?.value || "0"),
        currency: body.resource.amount?.currency_code || "USD",
        raw: body,
      };
    }

    if (body.event_type === "PAYMENT.CAPTURE.DENIED") {
      return {
        eventType: "payment.failed",
        orderId: body.resource.purchase_units?.[0]?.reference_id,
        paymentRef: body.resource.id,
        raw: body,
      };
    }

    return { eventType: "ignored", raw: body };
  }

  async retrievePaymentStatus(
    providerRef: string
  ): Promise<"succeeded" | "pending" | "failed" | "unknown"> {
    try {
      const token = await getAccessToken();
      const { data } = await axios.get(
        `${PAYPAL_API}/v2/checkout/orders/${providerRef}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.status === "COMPLETED") return "succeeded";
      if (
        data.status === "APPROVED" ||
        data.status === "CREATED" ||
        data.status === "PAYER_ACTION_REQUIRED"
      ) return "pending";
      if (data.status === "VOIDED") return "failed";
      return "unknown";
    } catch {
      return "unknown";
    }
  }
}