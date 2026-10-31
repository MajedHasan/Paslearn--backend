import { Request, Response, NextFunction } from "express";
import { orderService } from "./order.service";
import { paymentService } from "../payments/payment.service";
import { paymentProviders } from "../payments/factory";
import { AppError } from "../../utils/appError";
import OrderModel from "./order.model";

export const orderController = {
  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await orderService.preview((req as any).user.sub);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.createFromCart((req as any).user.sub, {
        affiliateCode: req.body.affiliateCode,
      });
      res.status(201).json({ success: true, data: order });
    } catch (err) { next(err); }
  },

  async pay(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { provider, successUrl, cancelUrl } = req.body;
      const order = await OrderModel.findOne({ _id: req.params.id, user: user.sub });
      if (!order) throw new AppError("Order not found", 404);
      if (order.status !== "pending") throw new AppError("Order is not payable", 400);

      const adapter = paymentProviders.get(provider);
      const result = order.items.every((i) => i.tierId)
        ? await adapter.createSubscription({
            order,
            successUrl: successUrl || "",
            cancelUrl: cancelUrl || "",
            customerEmail: user.email,
          })
        : await adapter.createOneTimePayment({
            order,
            successUrl: successUrl || "",
            cancelUrl: cancelUrl || "",
            customerEmail: user.email,
          });

      // Persist payment record
      await paymentService.record({
        orderId: String(order._id),
        provider,
        providerRef: result.providerRef,
        amount: order.total,
        currency: order.currency,
      });

      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await orderService.getOne((req as any).user.sub, req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await orderService.getMine((req as any).user.sub);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await orderService.cancel((req as any).user.sub, req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async adminRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderModel.findById(req.params.id);
      if (!order) throw new AppError("Order not found", 404);
      const payment = await paymentService.findByOrder(String(order._id));
      if (payment) {
        const adapter = paymentProviders.get(payment.provider as any);
        await adapter.refund(payment.providerRef, order.total);
        await paymentService.markRefunded(String(payment._id), order.total);
      }
      const refunded = await orderService.refund(String(order._id), req.body.reason);
      res.json({ success: true, data: refunded });
    } catch (err) { next(err); }
  },

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.verifyPayment(req.params.id);
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  },

};