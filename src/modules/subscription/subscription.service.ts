import SubscriptionModel from "./subscription.model";
import PlanModel from "../plan/plan.model";
import { ISubscription } from "./subscription.interface";

export async function createSubscription(
  userId: string,
  planId: string,
  billingCycle: "monthly" | "yearly" | "lifetime",
  startDate?: Date,
  endDate?: Date
): Promise<ISubscription> {
  const plan = await PlanModel.findById(planId);
  if (!plan) throw new Error("Plan not found");

  // Optionally deactivate existing active subscription
  const existingActive = await SubscriptionModel.findOne({
    user: userId,
    status: "active",
  });
  if (existingActive) {
    existingActive.status = "canceled";
    await existingActive.save();
  }

  const status = plan.price.amount === 0 ? "active" : "pending";

  return SubscriptionModel.create({
    user: userId,
    plan: planId,
    // status: "active",
    status,
    billingCycle,
    startDate: startDate || new Date(),
    endDate: endDate || undefined,
    autoRenew: true,   // <-- add this line
  });
}

export async function getAllSubscriptions(filter: Record<string, any> = {}): Promise<ISubscription[]> {
  return SubscriptionModel.find(filter)
    .populate("user", "name email role")
    .populate("plan", "name slug")
    .sort({ createdAt: -1 })
    .lean();
}

export async function getUserSubscriptions(userId: string): Promise<ISubscription[]> {
  return SubscriptionModel.find({ user: userId })
    .populate("plan")
    .sort({ createdAt: -1 })
    .lean();
}

export async function getSubscriptionById(id: string): Promise<ISubscription | null> {
  return SubscriptionModel.findById(id)
    .populate("user", "name email role")
    .populate("plan")
    .lean();
}

export async function updateSubscription(
  id: string,
  payload: Partial<ISubscription>
): Promise<ISubscription | null> {
  const sub = await SubscriptionModel.findById(id);
  if (!sub) return null;
  Object.assign(sub, payload);
  await sub.save();
  return sub.toObject();
}

export async function cancelSubscription(id: string): Promise<ISubscription | null> {
  const sub = await SubscriptionModel.findById(id);
  if (!sub) throw new Error("Subscription not found");
  sub.status = "canceled";
  await sub.save();
  return sub.toObject();
}

export async function getActiveSubscription(userId: string): Promise<ISubscription | null> {
  return SubscriptionModel.findOne({ user: userId, status: "active" })
    .populate("plan")
    .lean();
}