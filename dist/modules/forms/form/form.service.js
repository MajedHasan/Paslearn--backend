"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const form_model_1 = __importDefault(require("./form.model"));
const validation_utils_1 = require("../shared/validation.utils");
class FormService {
    async createForm(payload) {
        const existing = await form_model_1.default.findOne({ key: payload.key });
        if (existing)
            throw new Error(`Form with key "${payload.key}" already exists`);
        const errors = (0, validation_utils_1.validateFormSchema)(payload.fields ?? [], payload.layout ?? []);
        if (errors.length)
            throw new Error(errors.join(", "));
        if (payload.conditions?.length) {
            const condErrors = (0, validation_utils_1.validateConditionalRules)(payload.conditions, payload.fields ?? []);
            if (condErrors.length)
                throw new Error(condErrors.join(", "));
        }
        const form = new form_model_1.default(payload);
        await form.save();
        return form;
    }
    async getAllForms(filters = {}) {
        return form_model_1.default.find(filters).sort({ createdAt: -1 }).lean();
    }
    async getFormById(id) {
        return form_model_1.default.findById(id).lean();
    }
    async getFormByKey(key) {
        return form_model_1.default.findOne({ key }).lean();
    }
    async getPublicFormByKey(key) {
        return form_model_1.default.findOne({ key, enabled: true }).lean();
    }
    async updateForm(id, payload) {
        const form = await form_model_1.default.findById(id);
        if (!form)
            return null;
        if (payload.key && payload.key !== form.key) {
            const dup = await form_model_1.default.findOne({ key: payload.key, _id: { $ne: id } });
            if (dup)
                throw new Error(`Form with key "${payload.key}" already exists`);
        }
        const nextFields = payload.fields ?? form.fields;
        const nextLayout = payload.layout ?? form.layout;
        const nextConditions = payload.conditions ?? form.conditions;
        const errors = (0, validation_utils_1.validateFormSchema)(nextFields, nextLayout);
        if (errors.length)
            throw new Error(errors.join(", "));
        if (nextConditions?.length) {
            const condErrors = (0, validation_utils_1.validateConditionalRules)(nextConditions, nextFields);
            if (condErrors.length)
                throw new Error(condErrors.join(", "));
        }
        Object.assign(form, payload);
        await form.save();
        return form.toObject();
    }
    async deleteForm(id) {
        return form_model_1.default.findByIdAndDelete(id).lean();
    }
    async toggleForm(id) {
        const form = await form_model_1.default.findById(id);
        if (!form)
            throw new Error("Form not found");
        form.enabled = !form.enabled;
        await form.save();
        return form.toObject();
    }
    async incrementSubmissionCount(id) {
        await form_model_1.default.findByIdAndUpdate(id, { $inc: { submissionCount: 1 } });
    }
    async duplicateForm(id) {
        const original = await form_model_1.default.findById(id);
        if (!original)
            return null;
        const newKey = `${original.key}_copy_${Date.now()}`;
        const duplicate = {
            ...original.toObject(),
            _id: undefined,
            key: newKey,
            name: `${original.name} (Copy)`,
            isTemplate: false,
            createdAt: undefined,
            updatedAt: undefined,
        };
        return form_model_1.default.create(duplicate);
    }
    async getFormAnalytics(id) {
        const form = await form_model_1.default.findById(id).select("submissionCount").lean();
        if (!form)
            return null;
        // In a real app, query a submissions collection
        return {
            views: 0,
            submissions: form?.submissionCount ?? 0,
            conversionRate: 0,
        };
    }
}
exports.default = new FormService();
