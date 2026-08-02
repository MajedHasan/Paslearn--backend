import { Document, Types } from "mongoose";

// ── Trigger ──────────────────────────────────────────────
export type AutomationResource =
  | "form"
  | "course"
  | "booking"
  | "user"
  | "subscription"
  | "payment"
  | "certificate";

export type AutomationEvent =
  | "submitted"
  | "created"
  | "updated"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled"
  | "registered"
  | "paid";

export interface IAutomationTrigger {
  resource: AutomationResource;
  event: AutomationEvent;
  filters?: Record<string, any>; // e.g. { "key": "teacher_onboarding" }
}

// ── Condition ────────────────────────────────────────────
export interface IAutomationCondition {
  field: string; // dot‑notation path, e.g. "values.email"
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "is_empty"
    | "is_not_empty"
    | "regex";
  value?: any;
}

export interface IAutomationConditionGroup {
  logicalOperator?: "AND" | "OR";
  conditions: IAutomationCondition[];
}

// ── Action ───────────────────────────────────────────────
export type AutomationActionType =
  | "send_email"
  | "send_sms"
  | "add_tag"
  | "assign_role"
  | "send_webhook"
  | "update_submission_status"
  | "ai_generate"
  | "wait"; // explicit wait step (alternative to delayMs)

export interface IAutomationAction {
  type: AutomationActionType;
  config: Record<string, any>; // flexible per action
}

// ── Workflow Step ────────────────────────────────────────
export interface IAutomationStep {
  id: string;                     // unique within the automation (client‑side)
  label?: string;                // e.g. "Send welcome email"
  delayMs: number;               // delay after previous step (0 = immediate)
  conditionGroups?: IAutomationConditionGroup[];
  actions: IAutomationAction[]; // executed in parallel inside the step
  retryOnFailure?: boolean;     // continue to next step even if actions fail?
}

// ── Execution Log ────────────────────────────────────────
export interface IAutomationExecutionLog extends Document {
  automation: Types.ObjectId;
  triggerData: Record<string, any>;
  steps: {
    stepId: string;
    status: "pending" | "running" | "success" | "failure" | "skipped";
    actions: {
      type: AutomationActionType;
      status: "success" | "failure";
      message?: string;
    }[];
  }[];
  overallStatus: "running" | "success" | "failure";
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
}

// ── Main Automation ──────────────────────────────────────
export interface IAutomation extends Document {
  name: string;
  description?: string;
  enabled: boolean;
  trigger: IAutomationTrigger;
  steps: IAutomationStep[];
  lastExecutedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}