"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubscription = createSubscription;
exports.getAllSubscriptions = getAllSubscriptions;
exports.getUserSubscriptions = getUserSubscriptions;
exports.getSubscriptionById = getSubscriptionById;
exports.updateSubscription = updateSubscription;
exports.cancelSubscription = cancelSubscription;
exports.getActiveSubscription = getActiveSubscription;
const subscription_model_1 = __importDefault(require("./subscription.model"));
const plan_model_1 = __importDefault(require("../plan/plan.model"));
async function createSubscription(userId, planId, billingCycle, startDate, endDate) {
    const plan = await plan_model_1.default.findById(planId);
    if (!plan)
        throw new Error("Plan not found");
    // Optionally deactivate existing active subscription
    const existingActive = await subscription_model_1.default.findOne({
        user: userId,
        status: "active",
    });
    if (existingActive) {
        existingActive.status = "canceled";
        await existingActive.save();
    }
    const status = plan.price.amount === 0 ? "active" : "pending";
    return subscription_model_1.default.create({
        user: userId,
        plan: planId,
        // status: "active",
        status,
        billingCycle,
        startDate: startDate || new Date(),
        endDate: endDate || undefined,
    });
}
async function getAllSubscriptions(filter = {}) {
    return subscription_model_1.default.find(filter)
        .populate("user", "name email role")
        .populate("plan", "name slug")
        .sort({ createdAt: -1 })
        .lean();
}
async function getUserSubscriptions(userId) {
    return subscription_model_1.default.find({ user: userId })
        .populate("plan")
        .sort({ createdAt: -1 })
        .lean();
}
async function getSubscriptionById(id) {
    return subscription_model_1.default.findById(id)
        .populate("user", "name email role")
        .populate("plan")
        .lean();
}
async function updateSubscription(id, payload) {
    const sub = await subscription_model_1.default.findById(id);
    if (!sub)
        return null;
    Object.assign(sub, payload);
    await sub.save();
    return sub.toObject();
}
async function cancelSubscription(id) {
    const sub = await subscription_model_1.default.findById(id);
    if (!sub)
        throw new Error("Subscription not found");
    sub.status = "canceled";
    await sub.save();
    return sub.toObject();
}
async function getActiveSubscription(userId) {
    return subscription_model_1.default.findOne({ user: userId, status: "active" })
        .populate("plan")
        .lean();
}
