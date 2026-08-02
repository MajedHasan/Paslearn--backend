import mongoose, { Schema } from "mongoose";
import { IAutomation, IAutomationExecutionLog } from "./automation.interface";

// ── Sub‑schemas (unchanged) ─────────────────────────────
const TriggerSchema = new Schema(
  {
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
    filters: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const ConditionSchema = new Schema(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      enum: [
        "equals", "not_equals", "contains", "greater_than",
        "less_than", "is_empty", "is_not_empty", "regex",
      ],
      required: true,
    },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const ConditionGroupSchema = new Schema(
  {
    logicalOperator: { type: String, enum: ["AND", "OR"], default: "AND" },
    conditions: [ConditionSchema],
  },
  { _id: false }
);

const ActionSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "send_email", "send_sms", "add_tag", "assign_role",
        "send_webhook", "update_submission_status", "ai_generate", "wait",
      ],
      required: true,
    },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const StepSchema = new Schema(
  {
    id: { type: String, required: true },
    label: String,
    delayMs: { type: Number, default: 0 },
    conditionGroups: [ConditionGroupSchema],
    actions: [ActionSchema],
    retryOnFailure: { type: Boolean, default: false },
  },
  { _id: false }
);

// ── Main Automation Schema ───────────────────────────────
const AutomationSchema = new Schema<IAutomation>(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    enabled: { type: Boolean, default: true, index: true },
    trigger: { type: TriggerSchema, required: true },
    steps: { type: [StepSchema], default: [] },
    lastExecutedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

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
        return next(
          new Error(`Step "${step.id}" must have at least one action or a delay`)
        );
      }
    }
  }
  next();
});

export const AutomationModel = mongoose.model<IAutomation>("Automation", AutomationSchema);

// ── Execution Log Schemas (CORRECTED) ────────────────────
// Dedicated sub‑document for each action result
const ActionLogEntrySchema = new Schema(
  {
    type: { type: String, required: true },
    status: { type: String, enum: ["success", "failure"], required: true },
    message: String,
  },
  { _id: false }
);

const StepLogSchema = new Schema(
  {
    stepId: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "running", "success", "failure", "skipped"],
      default: "pending",
    },
    actions: [ActionLogEntrySchema],   // ← fixed – was causing CastError
  },
  { _id: false }
);

const ExecutionLogSchema = new Schema<IAutomationExecutionLog>(
  {
    automation: {
      type: Schema.Types.ObjectId,
      ref: "Automation",
      required: true,
      index: true,
    },
    triggerData: { type: Schema.Types.Mixed, required: true },
    steps: [StepLogSchema],
    overallStatus: {
      type: String,
      enum: ["running", "success", "failure"],
      default: "running",
    },
    errorMessage: String,
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
  },
  { timestamps: false, versionKey: false }
);

export const ExecutionLogModel = mongoose.model<IAutomationExecutionLog>(
  "AutomationExecutionLog",
  ExecutionLogSchema
);