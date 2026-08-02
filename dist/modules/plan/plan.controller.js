"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlanController = createPlanController;
exports.getAllPlansController = getAllPlansController;
exports.getActivePlansController = getActivePlansController;
exports.getPlanByIdController = getPlanByIdController;
exports.getPlanBySlugController = getPlanBySlugController;
exports.updatePlanController = updatePlanController;
exports.deletePlanController = deletePlanController;
exports.togglePlanActiveController = togglePlanActiveController;
const plan_service_1 = require("./plan.service");
async function createPlanController(req, res, next) {
    try {
        const plan = await (0, plan_service_1.createPlan)(req.body);
        return res.status(201).json({ success: true, message: "Plan created", data: plan });
    }
    catch (error) {
        next(error);
    }
}
async function getAllPlansController(req, res, next) {
    try {
        const plans = await (0, plan_service_1.getAllPlans)(req.query);
        return res.status(200).json({ success: true, data: plans });
    }
    catch (error) {
        next(error);
    }
}
async function getActivePlansController(req, res, next) {
    try {
        const role = req.query.role;
        const plans = await (0, plan_service_1.getActivePlans)(role);
        return res.status(200).json({ success: true, data: plans });
    }
    catch (error) {
        next(error);
    }
}
async function getPlanByIdController(req, res, next) {
    try {
        const plan = await (0, plan_service_1.getPlanById)(req.params.id);
        if (!plan)
            return res.status(404).json({ success: false, message: "Plan not found" });
        return res.status(200).json({ success: true, data: plan });
    }
    catch (error) {
        next(error);
    }
}
async function getPlanBySlugController(req, res, next) {
    try {
        const plan = await (0, plan_service_1.getPlanBySlug)(req.params.slug);
        if (!plan)
            return res.status(404).json({ success: false, message: "Plan not found" });
        return res.status(200).json({ success: true, data: plan });
    }
    catch (error) {
        next(error);
    }
}
async function updatePlanController(req, res, next) {
    try {
        const plan = await (0, plan_service_1.updatePlan)(req.params.id, req.body);
        if (!plan)
            return res.status(404).json({ success: false, message: "Plan not found" });
        return res.status(200).json({ success: true, message: "Plan updated", data: plan });
    }
    catch (error) {
        next(error);
    }
}
async function deletePlanController(req, res, next) {
    try {
        const plan = await (0, plan_service_1.deletePlan)(req.params.id);
        if (!plan)
            return res.status(404).json({ success: false, message: "Plan not found" });
        return res.status(200).json({ success: true, message: "Plan deleted" });
    }
    catch (error) {
        next(error);
    }
}
async function togglePlanActiveController(req, res, next) {
    try {
        const plan = await (0, plan_service_1.togglePlanActive)(req.params.id);
        return res.status(200).json({
            success: true,
            message: `Plan ${plan.isActive ? "activated" : "deactivated"}`,
            data: plan,
        });
    }
    catch (error) {
        next(error);
    }
}
