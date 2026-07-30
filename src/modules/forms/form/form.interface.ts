import { Document, Types } from "mongoose";
import { FieldDefinition } from "../shared/field.types";
import { LayoutBlock } from "../shared/layout.types";

export type SubmitActionType = "message" | "redirect" | "message_then_redirect";

export interface IFormSubmitAction {
  type: SubmitActionType;
  message?: string;
  redirectTo?: string;
  delayMs?: number;
}

export interface IFormMeta {
  submitButtonText?: string;
  successTitle?: string;
  successMessage?: string;
  theme?: {
    accent?: string;
    radius?: string;
  };
  // optional custom CSS / JS for the form wrapper
  customCSS?: string;
}

// Conditional logic – enterprise level
export interface ConditionalCondition {
  fieldKey: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
  value?: any;                 // not required for is_empty/is_not_empty
}

export interface ConditionalRule {
  fieldKey: string;
  conditions: ConditionalCondition[];
  action: "show" | "hide" | "enable" | "disable";
  logicalOperator?: "AND" | "OR";   // default AND
}

// Multi‑step wizard
export interface FormStep {
  title: string;
  description?: string;
  layout: LayoutBlock[];       // layout specific to this step
  // progress bar label
  stepLabel?: string;
}

// Spam & security
export interface SpamProtection {
  enabled: boolean;
  type: "honeypot" | "recaptcha_v2" | "recaptcha_v3";
  siteKey?: string;            // public key (stored in form, used on frontend)
  secretKey?: string;          // private key (never exposed – store in env, we keep optional here for admin config)
  threshold?: number;          // for recaptcha v3 (0.0 - 1.0)
}

// Email notifications
export interface NotificationEmail {
  to: string[];                // can include field placeholders like "{{email}}"
  subject: string;
  body: string;                // HTML or plain text, supports placeholders
  trigger: "on_submit" | "on_approve" | "on_reject";
  from?: string;
  replyTo?: string;
}

// Webhook integration
export interface WebhookConfig {
  url: string;
  method: "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
  bodyTemplate?: Record<string, any>;  // JSON with placeholder values
  retryOnFailure?: boolean;
  secret?: string;             // for HMAC verification
}

// Analytics & tracking
export interface FormAnalytics {
  views: number;
  submissions: number;
  conversionRate: number;
  averageTimeSpent?: number;   // in seconds
  lastSubmissionAt?: Date;
}

// AI‑powered assistant settings (future)
export interface AIAssistant {
  enabled: boolean;
  suggestions?: string[];      // pre‑defined prompt suggestions
  model?: string;              // e.g. "gpt-4o-mini"
}

// Main Form document
export interface IForm extends Document {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;

  // Core
  fields: FieldDefinition[];
  layout: LayoutBlock[];

  // Multi‑step
  steps?: FormStep[];
  showProgressBar?: boolean;

  // Conditional logic
  conditions?: ConditionalRule[];

  // Submit behaviour
  submitAction?: IFormSubmitAction;
  meta?: IFormMeta;

  // Security & spam
  spamProtection?: SpamProtection;

  // Notifications & integrations
  notifications?: NotificationEmail[];
  webhooks?: WebhookConfig[];

  // Analytics (populated on read, not stored directly)
  analytics?: FormAnalytics;

  // AI (optional)
  aiAssistant?: AIAssistant;

  // Organisation
  tags?: string[];
  version?: string;
  isTemplate?: boolean;       // if true, can be cloned

  // Relations
  automations?: Types.ObjectId[];   // linked automations

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}