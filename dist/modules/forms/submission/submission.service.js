"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const form_model_1 = __importDefault(require("../form/form.model"));
const submission_model_1 = __importDefault(require("./submission.model"));
const automation_service_1 = require("../automation/automation.service");
class SubmissionService {
    /**
     * Create a new submission from public form data.
     * `payload.values` contains all field values (text).
     * `payload.files` is an array of uploaded file info.
     * `payload.meta` is browser metadata.
     */
    async createPublicSubmission(formKey, payload, user) {
        // Find enabled form
        const form = await form_model_1.default.findOne({ key: formKey, enabled: true }).lean();
        if (!form)
            throw new Error("Form not found or disabled");
        // Create submission
        const submission = await submission_model_1.default.create({
            form: form._id,
            formKey: form.key,
            formSnapshot: {
                key: form.key,
                name: form.name,
                description: form.description,
                fields: form.fields,
                layout: form.layout,
                submitAction: form.submitAction,
                meta: form.meta,
            },
            values: payload.values || {},
            files: payload.files || [],
            meta: payload.meta || {},
            status: "new",
        });
        // Optionally increment submission count on form (if you have the field)
        await form_model_1.default.findByIdAndUpdate(form._id, { $inc: { submissionCount: 1 } });
        try {
            await (0, automation_service_1.executeAutomations)({
                resource: "form",
                event: "submitted",
                data: {
                    formId: form._id.toString(),
                    formKey: form.key,
                    submissionId: submission._id.toString(),
                    values: payload.values || {},
                    files: payload.files || [],
                    meta: payload.meta || {},
                },
                user: user || undefined,
            });
        }
        catch (err) {
            console.error("Automation execution failed:", err);
        }
        return submission;
    }
    async getAll(filters = {}) {
        return submission_model_1.default.find(filters)
            .populate("form", "name key")
            .sort({ createdAt: -1 })
            .lean();
    }
    async getById(id) {
        return submission_model_1.default.findById(id).populate("form", "name key").lean();
    }
    async updateStatus(id, status, notes) {
        const sub = await submission_model_1.default.findById(id);
        if (!sub)
            throw new Error("Submission not found");
        sub.status = status;
        if (notes)
            sub.notes = notes;
        await sub.save();
        return sub;
    }
}
exports.default = new SubmissionService();
