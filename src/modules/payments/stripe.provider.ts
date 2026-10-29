import Stripe from "stripe";
import { PaymentProvider, PaymentAdapterInput, PaymentResult, ParsedPaymentEvent } from "./provider.interface";
import { AppError } from "../../utils/appError";

let stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new AppError("STRIPE_SECRET_KEY not configured", 500);
    stripe = new Stripe(key);
  }
  return stripe;
}

export class StripeProvider implements PaymentProvider {
  name = "stripe" as const;

  async createOneTimePayment(input: PaymentAdapterInput): Promise<PaymentResult> {
    const s = getStripe();
    const intent = await s.paymentIntents.create({
      amount: Math.round(input.order.total * 100),
      currency: input.order.currency.toLowerCase(),
      metadata: { orderId: String(input.order._id) },
      receipt_email: input.customerEmail,
      automatic_payment_methods: { enabled: true },
    });
    return { providerRef: intent.id, clientSecret: intent.client_secret! };
  }

  async createSubscription(input: PaymentAdapterInput): Promise<PaymentResult> {
    const s = getStripe();
    const order = input.order;
    const item = order.items[0];
    const intervalMap: Record<string, Stripe.Price.Recurring.Interval> = {
      weekly: "week",
      monthly: "month",
      yearly: "year",
    };

    // Requires a Stripe Price for the tier — created on the fly if needed
    const session = await s.checkout.sessions.create({
      mode: "subscription",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customerEmail,
      metadata: { orderId: String(order._id) },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: Math.round(item.finalPrice * 100),
          recurring: {
            interval: intervalMap[(item.tierId || "monthly") as string] as any || "month",
          },
          product_data: { name: `Order ${order.orderNumber}` },
        },
      }],
    });
    return {
      providerRef: session.id,
      approvalUrl: session.url!,
      subscriptionId: session.subscription as string | undefined,
    };
  }

  async refund(paymentRef: string, amount: number) {
    const s = getStripe();
    const refund = await s.refunds.create({
      payment_intent: paymentRef,
      amount: Math.round(amount * 100),
    });
    return { refundRef: refund.id, status: refund.status || "pending" };
  }

  async verifyWebhook(headers: Record<string, any>, rawBody: Buffer | string): Promise<ParsedPaymentEvent> {
    const s = getStripe();
    const sig = headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new AppError("STRIPE_WEBHOOK_SECRET not configured", 500);

    let event: Stripe.Event;
    try {
      event = s.webhooks.constructEvent(rawBody, sig, secret);
    } catch (err: any) {
      throw new AppError(`Stripe webhook verification failed: ${err.message}`, 400);
    }

    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        return {
          eventType: "payment.succeeded",
          orderId: pi.metadata.orderId,
          paymentRef: pi.id,
          amount: pi.amount / 100,
          currency: pi.currency.toUpperCase(),
          raw: event,
        };
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        return {
          eventType: "payment.failed",
          orderId: pi.metadata.orderId,
          paymentRef: pi.id,
          raw: event,
        };
      }
      case "checkout.session.completed": {
        const sess = event.data.object as Stripe.Checkout.Session;
        return {
          eventType: "payment.succeeded",
          orderId: sess.metadata?.orderId,
          paymentRef: sess.id,
          subscriptionId: sess.subscription as string | undefined,
          amount: (sess.amount_total ?? 0) / 100,
          currency: (sess.currency ?? "usd").toUpperCase(),
          raw: event,
        };
      }
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const sub = (inv as any).subscription as string | undefined;
        return {
          eventType: "subscription.renewed",
          paymentRef: inv.id,
          subscriptionId: sub,
          amount: (inv.amount_paid ?? 0) / 100,
          currency: (inv.currency || "usd").toUpperCase(),
          raw: event,
        };
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        return {
          eventType: "subscription.cancelled",
          subscriptionId: sub.id,
          raw: event,
        };
      }
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        return {
          eventType: "refund.created",
          paymentRef: (ch.payment_intent as string) || ch.id,
          amount: (ch.amount_refunded ?? 0) / 100,
          currency: ch.currency.toUpperCase(),
          raw: event,
        };
      }
      default:
        return { eventType: "ignored", raw: event };
    }
  }
}