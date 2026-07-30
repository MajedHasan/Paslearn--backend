import { Request, Response, NextFunction } from "express";
import {
  createSubscription,
  getAllSubscriptions,
  getUserSubscriptions,
  getSubscriptionById,
  updateSubscription,
  cancelSubscription,
  getActiveSubscription,
} from "./subscription.service";

export async function createSubscriptionController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user._id;
    const { planId, billingCycle, startDate, endDate } = req.body;
    const subscription = await createSubscription(
      userId,
      planId,
      billingCycle,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    return res.status(201).json({ success: true, message: "Subscription created", data: subscription });
  } catch (error) {
    next(error);
  }
}

export async function getAllSubscriptionsController(req: Request, res: Response, next: NextFunction) {
  try {
    const subs = await getAllSubscriptions(req.query as Record<string, any>);
    return res.status(200).json({ success: true, data: subs });
  } catch (error) {
    next(error);
  }
}

export async function getUserSubscriptionsController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user._id;
    const subs = await getUserSubscriptions(userId);
    return res.status(200).json({ success: true, data: subs });
  } catch (error) {
    next(error);
  }
}

export async function getSubscriptionByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const sub = await getSubscriptionById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: "Subscription not found" });
    return res.status(200).json({ success: true, data: sub });
  } catch (error) {
    next(error);
  }
}

export async function updateSubscriptionController(req: Request, res: Response, next: NextFunction) {
  try {
    const sub = await updateSubscription(req.params.id, req.body);
    if (!sub) return res.status(404).json({ success: false, message: "Subscription not found" });
    return res.status(200).json({ success: true, message: "Subscription updated", data: sub });
  } catch (error) {
    next(error);
  }
}

export async function cancelSubscriptionController(req: Request, res: Response, next: NextFunction) {
  try {
    const sub = await cancelSubscription(req.params.id);
    return res.status(200).json({ success: true, message: "Subscription cancelled", data: sub });
  } catch (error) {
    next(error);
  }
}

export async function getActiveSubscriptionController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user._id;
    const sub = await getActiveSubscription(userId);
    return res.status(200).json({ success: true, data: sub });
  } catch (error) {
    next(error);
  }
}