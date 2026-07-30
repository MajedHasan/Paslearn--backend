import { Document } from "mongoose";

export type PlanFeatureType = "boolean" | "number" | "text";

export interface IPlanFeature {
  key: string;                // machine‑readable, e.g. "courses_limit"
  label: string;              // human‑readable, e.g. "Courses"
  type: PlanFeatureType;      // controls display logic
  value: boolean | number | string; // actual value
  tooltip?: string;
  icon?: string;
}

export type BillingCycle = "monthly" | "yearly" | "lifetime";

export interface IPlanPrice {
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
}

export interface IPlanLimits {
  maxCourses: number;
  maxStudents: number;
  maxTemplates: number;
  maxLandingPages: number;
  maxForms: number;
  maxAutomations: number;
  maxSalesPages: number;
  maxFunnels: number;
  maxEmailCampaigns: number;
  maxDigitalProducts: number;
  maxCoachingClients: number;
  maxCourseEnrollments: number;
  certificateEnabled: boolean;
  jobBoardAccess: boolean;
  aiCredits?: number;         // future AI / credit limits
}

export type PlanAudience = "teacher" | "student" | "affiliate" | "all";

export interface IPlan extends Document {
  name: string;
  slug: string;
  description: string;

  // visual / marketing
  icon?: string;
  badge?: string;
  ctaText?: string;
  ctaUrl?: string;

  // pricing
  price: IPlanPrice;

  // status & ordering
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;

  // displayed features (rich objects)
  features: IPlanFeature[];

  // internal limits (for backend enforcement)
  limits: IPlanLimits;

  // target audience
  applicableTo: PlanAudience[];

  createdAt: Date;
  updatedAt: Date;
}