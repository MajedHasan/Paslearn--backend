"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const validation_utils_1 = require("../shared/validation.utils");
// ---------- Sub-schemas ----------
const FieldValidationSchema = new mongoose_1.Schema({
    required: { type: Boolean, default: false },
    minLength: Number,
    maxLength: Number,
    min: Number,
    max: Number,
    pattern: String,
    patternMessage: String,
    allowedTypes: [String],
    maxFileSize: Number,
    maxFiles: Number,
}, { _id: false });
const FieldSchema = new mongoose_1.Schema({
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: [
            "text",
            "email",
            "tel",
            "textarea",
            "select",
            "radio",
            "checkbox",
            "number",
            "date",
            "time",
            "url",
            "password",
            "hidden",
            "multiselect",
            "file",
            "rating",
            "date_range"
        ],
        required: true,
    },
    placeholder: String,
    helpText: String,
    defaultValue: mongoose_1.Schema.Types.Mixed,
    options: [{ label: String, value: String }],
    validation: { type: FieldValidationSchema, default: () => ({}) },
    hidden: { type: Boolean, default: false },
    width: { type: String, enum: ["full", "half", "third", "quarter"], default: "full" },
}, { _id: false, minimize: false });
const ConditionalConditionSchema = new mongoose_1.Schema({
    fieldKey: { type: String, required: true },
    operator: { type: String, enum: ["equals", "not_equals", "contains", "greater_than", "less_than", "is_empty", "is_not_empty"], required: true },
    value: { type: mongoose_1.Schema.Types.Mixed },
}, { _id: false });
const ConditionalRuleSchema = new mongoose_1.Schema({
    fieldKey: { type: String, required: true },
    conditions: [ConditionalConditionSchema],
    action: { type: String, enum: ["show", "hide", "enable", "disable"], required: true },
    logicalOperator: { type: String, enum: ["AND", "OR"], default: "AND" },
}, { _id: false });
const FormStepSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: String,
    stepLabel: String,
    layout: { type: [], default: [] }, // ← use empty array literal, equivalent to Schema.Types.Mixed but no TS error
}, { _id: false });
const SpamProtectionSchema = new mongoose_1.Schema({
    enabled: { type: Boolean, default: false },
    type: { type: String, enum: ["honeypot", "recaptcha_v2", "recaptcha_v3"], default: "honeypot" },
    siteKey: String,
    secretKey: String,
    threshold: Number,
}, { _id: false });
const NotificationEmailSchema = new mongoose_1.Schema({
    to: [{ type: String }],
    subject: String,
    body: String,
    trigger: { type: String, enum: ["on_submit", "on_approve", "on_reject"], default: "on_submit" },
    from: String,
    replyTo: String,
}, { _id: false });
const WebhookConfigSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    method: { type: String, enum: ["POST", "PUT", "PATCH"], default: "POST" },
    headers: { type: Map, of: String },
    bodyTemplate: { type: mongoose_1.Schema.Types.Mixed },
    retryOnFailure: Boolean,
    secret: String,
}, { _id: false });
const AIAssistantSchema = new mongoose_1.Schema({
    enabled: { type: Boolean, default: false },
    suggestions: [String],
    model: String,
}, { _id: false });
// ---------- Main Schema ----------
const FormSchema = new mongoose_1.Schema({
    key: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    enabled: { type: Boolean, default: false, index: true },
    fields: { type: [FieldSchema], default: [] },
    layout: { type: [], default: [] }, // ✅ fixed – no TS error
    steps: { type: [FormStepSchema], default: [] },
    showProgressBar: { type: Boolean, default: true },
    conditions: { type: [ConditionalRuleSchema], default: [] },
    submitAction: {
        type: mongoose_1.Schema.Types.Mixed,
        default: { type: "message", message: "Submitted successfully.", delayMs: 0 },
    },
    meta: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    spamProtection: { type: SpamProtectionSchema, default: () => ({ enabled: false, type: "honeypot" }) },
    notifications: { type: [NotificationEmailSchema], default: [] },
    webhooks: { type: [WebhookConfigSchema], default: [] },
    aiAssistant: { type: AIAssistantSchema, default: () => ({ enabled: false }) },
    tags: [{ type: String, trim: true }],
    version: { type: String, default: "1.0.0" },
    isTemplate: { type: Boolean, default: false },
    automations: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Automation" }],
}, { timestamps: true, versionKey: false });
// ---------- Indexes ----------
FormSchema.index({ enabled: 1, createdAt: -1 });
FormSchema.index({ key: 1 });
FormSchema.index({ tags: 1 });
FormSchema.index({ isTemplate: 1 });
// ---------- Pre‑save validation (typed correctly) ----------
FormSchema.pre("save", function (next) {
    const errors = (0, validation_utils_1.validateFormSchema)(this.fields, this.layout);
    if (errors.length)
        return next(new Error(errors.join(", ")));
    // Validate conditional rules
    if (this.conditions?.length) {
        const condErrors = (0, validation_utils_1.validateConditionalRules)(this.conditions, this.fields);
        if (condErrors.length)
            return next(new Error(condErrors.join(", ")));
    }
    // Validate multi‑step layouts
    if (this.steps?.length) {
        const stepErrors = (0, validation_utils_1.validateSteps)(this.steps, this.fields);
        if (stepErrors.length)
            return next(new Error(stepErrors.join(", ")));
    }
    next();
});
exports.default = mongoose_1.default.model("Form", FormSchema);
