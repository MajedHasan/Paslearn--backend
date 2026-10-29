import { Request, Response, NextFunction } from "express";
import { paymentProviders } from "./factory";
import { paymentService } from "./payment.service";
import { orderService } from "../order/order.service";
import OrderModel from "../order/order.model";

async function handleEvent(name: "stripe" | "paypal", headers: any, rawBody: Buffer | string) {
  const adapter = paymentProviders.get(name);
  const event = await adapter.verifyWebhook(headers, rawBody);

  switch (event.eventType) {
    case "payment.succeeded": {
      if (event.orderId) {
        await paymentService.markSucceeded(event.paymentRef!, event.raw);
        await orderService.markPaid(event.orderId, {
          free: false,
          subscriptionId: event.subscriptionId,
        });
      }
      break;
    }
    case "payment.failed": {
      if (event.paymentRef) await paymentService.markFailed(event.paymentRef, event.raw);
      if (event.orderId) await orderService.markFailed(event.orderId);
      break;
    }
    case "subscription.renewed": {
      // Find order via payment subscriptionId (deferred — needs subId column)
      // For now, log; full renewal handling lands with subscription module
      console.log("Stripe/PayPal subscription renewal:", event.subscriptionId);
      break;
    }
    case "subscription.cancelled": {
      console.log("Subscription cancelled:", event.subscriptionId);
      break;
    }
    case "refund.created": {
      console.log("Refund webhook:", event.paymentRef, event.amount);
      break;
    }
    case "ignored":
      break;
  }
  return event;
}

export const webhookController = {
  async stripe(req: Request, res: Response, next: NextFunction) {
    try {
      await handleEvent("stripe", req.headers as any, req.body as Buffer);
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  },
  async paypal(req: Request, res: Response, next: NextFunction) {
    try {
      await handleEvent("paypal", req.headers as any, req.body as Buffer);
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  },
};