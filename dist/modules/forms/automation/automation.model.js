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
exports.ExecutionLogModel = exports.AutomationModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ── Sub‑schemas (unchanged) ─────────────────────────────
const TriggerSchema = new mongoose_1.Schema({
    resource: {
        type: String,
        enum: ["form", "course", "booking", "user", "subscription", "payment", "certificate"],
        required: true,
    },
    event: {
        type: String,
        enum: [
            "submitted", "created", "updated", "approved", "rejected",
            "completed", "cancelled", "registered", "paid",
        ],
        required: true,
    },
    filters: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { _id: false });
const ConditionSchema = new mongoose_1.Schema({
    field: { type: String, required: true },
    operator: {
        type: String,
        enum: [
            "equals", "not_equals", "contains", "greater_than",
            "less_than", "is_empty", "is_not_empty", "regex",
        ],
        required: true,
    },
    value: { type: mongoose_1.Schema.Types.Mixed },
}, { _id: false });
const ConditionGroupSchema = new mongoose_1.Schema({
    logicalOperator: { type: String, enum: ["AND", "OR"], default: "AND" },
    conditions: [ConditionSchema],
}, { _id: false });
const ActionSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: [
            "send_email", "send_sms", "add_tag", "assign_role",
            "send_webhook", "update_submission_status", "ai_generate", "wait",
        ],
        required: true,
    },
    config: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { _id: false });
const StepSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    label: String,
    delayMs: { type: Number, default: 0 },
    conditionGroups: [ConditionGroupSchema],
    actions: [ActionSchema],
    retryOnFailure: { type: Boolean, default: false },
}, { _id: false });
// ── Main Automation Schema ───────────────────────────────
const AutomationSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    description: String,
    enabled: { type: Boolean, default: true, index: true },
    trigger: { type: TriggerSchema, required: true },
    steps: { type: [StepSchema], default: [] },
    lastExecutedAt: Date,
}, {
    timestamps: true,
    versionKey: false,
});
AutomationSchema.index({ "trigger.resource": 1, "trigger.event": 1, enabled: 1 });
// ⬇️ FIXED: allow steps with delay but no actions
AutomationSchema.pre("validate", function (next) {
    if (this.steps?.length) {
        for (const step of this.steps) {
            if (!step.id?.trim()) {
                return next(new Error("Each step requires a unique id"));
            }
            // A step is valid if it has at least one action OR a positive delay
            if (!step.actions?.length && step.delayMs === 0) {
                return next(new Error(`Step "${step.id}" must have at least one action or a delay`));
            }
        }
    }
    next();
});
exports.AutomationModel = mongoose_1.default.model("Automation", AutomationSchema);
// ── Execution Log Schemas (CORRECTED) ────────────────────
// Dedicated sub‑document for each action result
const ActionLogEntrySchema = new mongoose_1.Schema({
    type: { type: String, required: true },
    status: { type: String, enum: ["success", "failure"], required: true },
    message: String,
}, { _id: false });
const StepLogSchema = new mongoose_1.Schema({
    stepId: { type: String, required: true },
    status: {
        type: String,
        enum: ["pending", "running", "success", "failure", "skipped"],
        default: "pending",
    },
    actions: [ActionLogEntrySchema], // ← fixed – was causing CastError
}, { _id: false });
const ExecutionLogSchema = new mongoose_1.Schema({
    automation: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Automation",
        required: true,
        index: true,
    },
    triggerData: { type: mongoose_1.Schema.Types.Mixed, required: true },
    steps: [StepLogSchema],
    overallStatus: {
        type: String,
        enum: ["running", "success", "failure"],
        default: "running",
    },
    errorMessage: String,
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
}, { timestamps: false, versionKey: false });
exports.ExecutionLogModel = mongoose_1.default.model("AutomationExecutionLog", ExecutionLogSchema);
