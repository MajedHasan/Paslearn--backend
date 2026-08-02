"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTeacherApplication = createTeacherApplication;
exports.getTeacherProfile = getTeacherProfile;
exports.updateTeacherProfile = updateTeacherProfile;
const teacherProfile_model_1 = __importDefault(require("./teacherProfile.model"));
const plan_model_1 = __importDefault(require("../../plan/plan.model"));
const subscription_service_1 = require("../../subscription/subscription.service");
async function createTeacherApplication(payload) {
    // Check if teacher profile already exists
    const existing = await teacherProfile_model_1.default.findOne({ user: payload.user });
    if (existing) {
        throw new Error("Teacher profile already exists for this user");
    }
    // Determine if plan is free or paid
    let status = "active";
    let subscriptionBillingCycle = "monthly";
    if (payload.selectedPlan) {
        const plan = await plan_model_1.default.findById(payload.selectedPlan);
        if (!plan)
            throw new Error("Selected plan not found");
        subscriptionBillingCycle = plan.price.billingCycle;
        if (plan.price.amount > 0) {
            // Paid plan: require payment before activation
            status = "pending_payment";
        }
    }
    // Create the teacher profile
    const teacherProfile = await teacherProfile_model_1.default.create({
        user: payload.user,
        domain: payload.domain,
        academicCareer: payload.academicCareer,
        certificates: payload.certificates,
        reference: payload.reference,
        recommendation: payload.recommendation,
        recommendationImage: payload.recommendationImage,
        customFields: payload.customFields,
        selectedPlan: payload.selectedPlan,
        selectedTemplate: payload.selectedTemplate,
        photo: payload.photo,
        status,
    });
    // Create subscription record if a plan was chosen
    if (payload.selectedPlan) {
        await (0, subscription_service_1.createSubscription)(payload.user, payload.selectedPlan, subscriptionBillingCycle, new Date(), undefined);
    }
    return teacherProfile;
}
async function getTeacherProfile(userId) {
    return teacherProfile_model_1.default.findOne({ user: userId })
        .populate("selectedPlan")
        .populate("selectedTemplate")
        .lean();
}
async function updateTeacherProfile(userId, data) {
    return teacherProfile_model_1.default.findOneAndUpdate({ user: userId }, data, {
        new: true,
    }).lean();
}
