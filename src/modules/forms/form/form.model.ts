import mongoose, { Schema } from "mongoose";
import { IForm } from "./form.interface";
import { validateFormSchema, validateConditionalRules, validateSteps } from "../shared/validation.utils";

// ---------- Sub-schemas ----------
const FieldValidationSchema = new Schema({
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

const FieldSchema = new Schema({
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
  defaultValue: Schema.Types.Mixed,
  options: [{ label: String, value: String }],
  validation: { type: FieldValidationSchema, default: () => ({}) },
  hidden: { type: Boolean, default: false },
  width: { type: String, enum: ["full","half","third","quarter"], default: "full" },
}, { _id: false, minimize: false });

const ConditionalConditionSchema = new Schema({
  fieldKey: { type: String, required: true },
  operator: { type: String, enum: ["equals","not_equals","contains","greater_than","less_than","is_empty","is_not_empty"], required: true },
  value: { type: Schema.Types.Mixed },
}, { _id: false });

const ConditionalRuleSchema = new Schema({
  fieldKey: { type: String, required: true },
  conditions: [ConditionalConditionSchema],
  action: { type: String, enum: ["show","hide","enable","disable"], required: true },
  logicalOperator: { type: String, enum: ["AND","OR"], default: "AND" },
}, { _id: false });

const FormStepSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  stepLabel: String,
  layout: { type: [], default: [] },   // ← use empty array literal, equivalent to Schema.Types.Mixed but no TS error
}, { _id: false });

const SpamProtectionSchema = new Schema({
  enabled: { type: Boolean, default: false },
  type: { type: String, enum: ["honeypot","recaptcha_v2","recaptcha_v3"], default: "honeypot" },
  siteKey: String,
  secretKey: String,
  threshold: Number,
}, { _id: false });

const NotificationEmailSchema = new Schema({
  to: [{ type: String }],
  subject: String,
  body: String,
  trigger: { type: String, enum: ["on_submit","on_approve","on_reject"], default: "on_submit" },
  from: String,
  replyTo: String,
}, { _id: false });

const WebhookConfigSchema = new Schema({
  url: { type: String, required: true },
  method: { type: String, enum: ["POST","PUT","PATCH"], default: "POST" },
  headers: { type: Map, of: String },
  bodyTemplate: { type: Schema.Types.Mixed },
  retryOnFailure: Boolean,
  secret: String,
}, { _id: false });

const AIAssistantSchema = new Schema({
  enabled: { type: Boolean, default: false },
  suggestions: [String],
  model: String,
}, { _id: false });

// ---------- Main Schema ----------
const FormSchema = new Schema<IForm>({
  key: { type: String, required: true, unique: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  description: String,
  enabled: { type: Boolean, default: false, index: true },

  fields: { type: [FieldSchema], default: [] },
  layout: { type: [], default: [] },           // ✅ fixed – no TS error
  steps: { type: [FormStepSchema], default: [] },
  showProgressBar: { type: Boolean, default: true },

  conditions: { type: [ConditionalRuleSchema], default: [] },

  submitAction: {
    type: Schema.Types.Mixed,
    default: { type: "message", message: "Submitted successfully.", delayMs: 0 },
  },
  meta: { type: Schema.Types.Mixed, default: {} },

  spamProtection: { type: SpamProtectionSchema, default: () => ({ enabled: false, type: "honeypot" }) },
  notifications: { type: [NotificationEmailSchema], default: [] },
  webhooks: { type: [WebhookConfigSchema], default: [] },

  aiAssistant: { type: AIAssistantSchema, default: () => ({ enabled: false }) },

  tags: [{ type: String, trim: true }],
  version: { type: String, default: "1.0.0" },
  isTemplate: { type: Boolean, default: false },

  automations: [{ type: Schema.Types.ObjectId, ref: "Automation" }],
}, { timestamps: true, versionKey: false });

// ---------- Indexes ----------
FormSchema.index({ enabled: 1, createdAt: -1 });
FormSchema.index({ key: 1 });
FormSchema.index({ tags: 1 });
FormSchema.index({ isTemplate: 1 });

// ---------- Pre‑save validation (typed correctly) ----------
FormSchema.pre<IForm>("save", function (next) {
  const errors = validateFormSchema(this.fields, this.layout);
  if (errors.length) return next(new Error(errors.join(", ")));

  // Validate conditional rules
  if (this.conditions?.length) {
    const condErrors = validateConditionalRules(this.conditions, this.fields);
    if (condErrors.length) return next(new Error(condErrors.join(", ")));
  }

  // Validate multi‑step layouts
  if (this.steps?.length) {
    const stepErrors = validateSteps(this.steps, this.fields);
    if (stepErrors.length) return next(new Error(stepErrors.join(", ")));
  }

  next();
});

export default mongoose.model<IForm>("Form", FormSchema);