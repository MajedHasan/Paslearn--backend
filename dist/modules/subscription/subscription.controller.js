"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubscriptionController = createSubscriptionController;
exports.getAllSubscriptionsController = getAllSubscriptionsController;
exports.getUserSubscriptionsController = getUserSubscriptionsController;
exports.getSubscriptionByIdController = getSubscriptionByIdController;
exports.updateSubscriptionController = updateSubscriptionController;
exports.cancelSubscriptionController = cancelSubscriptionController;
exports.getActiveSubscriptionController = getActiveSubscriptionController;
const subscription_service_1 = require("./subscription.service");
async function createSubscriptionController(req, res, next) {
    try {
        const userId = req.user._id;
        const { planId, billingCycle, startDate, endDate } = req.body;
        const subscription = await (0, subscription_service_1.createSubscription)(userId, planId, billingCycle, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
        return res.status(201).json({ success: true, message: "Subscription created", data: subscription });
    }
    catch (error) {
        next(error);
    }
}
async function getAllSubscriptionsController(req, res, next) {
    try {
        const subs = await (0, subscription_service_1.getAllSubscriptions)(req.query);
        return res.status(200).json({ success: true, data: subs });
    }
    catch (error) {
        next(error);
    }
}
async function getUserSubscriptionsController(req, res, next) {
    try {
        const userId = req.user._id;
        const subs = await (0, subscription_service_1.getUserSubscriptions)(userId);
        return res.status(200).json({ success: true, data: subs });
    }
    catch (error) {
        next(error);
    }
}
async function getSubscriptionByIdController(req, res, next) {
    try {
        const sub = await (0, subscription_service_1.getSubscriptionById)(req.params.id);
        if (!sub)
            return res.status(404).json({ success: false, message: "Subscription not found" });
        return res.status(200).json({ success: true, data: sub });
    }
    catch (error) {
        next(error);
    }
}
async function updateSubscriptionController(req, res, next) {
    try {
        const sub = await (0, subscription_service_1.updateSubscription)(req.params.id, req.body);
        if (!sub)
            return res.status(404).json({ success: false, message: "Subscription not found" });
        return res.status(200).json({ success: true, message: "Subscription updated", data: sub });
    }
    catch (error) {
        next(error);
    }
}
async function cancelSubscriptionController(req, res, next) {
    try {
        const sub = await (0, subscription_service_1.cancelSubscription)(req.params.id);
        return res.status(200).json({ success: true, message: "Subscription cancelled", data: sub });
    }
    catch (error) {
        next(error);
    }
}
async function getActiveSubscriptionController(req, res, next) {
    try {
        const userId = req.user._id;
        const sub = await (0, subscription_service_1.getActiveSubscription)(userId);
        return res.status(200).json({ success: true, data: sub });
    }
    catch (error) {
        next(error);
    }
}
