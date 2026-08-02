"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlan = createPlan;
exports.getAllPlans = getAllPlans;
exports.getActivePlans = getActivePlans;
exports.getPlanById = getPlanById;
exports.getPlanBySlug = getPlanBySlug;
exports.updatePlan = updatePlan;
exports.deletePlan = deletePlan;
exports.togglePlanActive = togglePlanActive;
const plan_model_1 = __importDefault(require("./plan.model"));
function normalizeLimits(limits) {
    return {
        maxCourses: limits?.maxCourses ?? 0,
        maxStudents: limits?.maxStudents ?? 0,
        maxTemplates: limits?.maxTemplates ?? 0,
        maxLandingPages: limits?.maxLandingPages ?? 0,
        maxForms: limits?.maxForms ?? 0,
        maxAutomations: limits?.maxAutomations ?? 0,
        maxSalesPages: limits?.maxSalesPages ?? 0,
        maxFunnels: limits?.maxFunnels ?? 0,
        maxEmailCampaigns: limits?.maxEmailCampaigns ?? 0,
        maxDigitalProducts: limits?.maxDigitalProducts ?? 0,
        maxCoachingClients: limits?.maxCoachingClients ?? 0,
        maxCourseEnrollments: limits?.maxCourseEnrollments ?? 0,
        certificateEnabled: limits?.certificateEnabled ?? false,
        jobBoardAccess: limits?.jobBoardAccess ?? false,
        aiCredits: limits?.aiCredits ?? 0,
    };
}
async function createPlan(payload) {
    const existing = await plan_model_1.default.findOne({ slug: payload.slug });
    if (existing)
        throw new Error(`Plan with slug "${payload.slug}" already exists`);
    const plan = await plan_model_1.default.create({
        ...payload,
        limits: normalizeLimits(payload.limits),
    });
    return plan;
}
async function getAllPlans(filter = {}) {
    return plan_model_1.default.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean();
}
async function getActivePlans(role) {
    const query = { isActive: true };
    if (role) {
        query.applicableTo = { $in: ["all", role] };
    }
    return plan_model_1.default.find(query)
        .sort({ sortOrder: 1 })
        .lean();
}
async function getPlanById(id) {
    return plan_model_1.default.findById(id).lean();
}
async function getPlanBySlug(slug) {
    return plan_model_1.default.findOne({ slug }).lean();
}
async function updatePlan(id, payload) {
    const plan = await plan_model_1.default.findById(id);
    if (!plan)
        return null;
    if (payload.slug && payload.slug !== plan.slug) {
        const existing = await plan_model_1.default.findOne({ slug: payload.slug, _id: { $ne: id } });
        if (existing)
            throw new Error(`Plan with slug "${payload.slug}" already exists`);
    }
    if (payload.limits) {
        payload.limits = normalizeLimits(payload.limits);
    }
    Object.assign(plan, payload);
    await plan.save();
    return plan.toObject();
}
async function deletePlan(id) {
    return plan_model_1.default.findByIdAndDelete(id).lean();
}
async function togglePlanActive(id) {
    const plan = await plan_model_1.default.findById(id);
    if (!plan)
        throw new Error("Plan not found");
    plan.isActive = !plan.isActive;
    await plan.save();
    return plan.toObject();
}
