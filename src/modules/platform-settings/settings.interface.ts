// src/modules/platform-settings/settings.interface.ts
import { Document, Types } from "mongoose";

export interface IPlatformGeneral {
  siteName: string;
  siteTagline: string;
  siteUrl: string;
  supportEmail: string;
  logoUrl: string;
  faviconUrl: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export interface IPlatformCommerce {
  platformFeePercent: number;
  minPayoutAmount: number;
  payoutSchedule: "manual" | "auto";
  defaultCurrency: string;
  taxEnabled: boolean;
  taxPercent: number;
}

export interface IPlatformSubscriptions {
  freeTrialDays: number;
  gracePeriodDays: number;
  autoRenewByDefault: boolean;
  allowUpgrade: boolean;
  allowDowngrade: boolean;
  prorateOnUpgrade: boolean;
  cancelAtPeriodEnd: boolean;
  refundWindowDays: number;
  requiresApproval: boolean;
}

export interface IPlatformAddons {
  enabled: boolean;
  allowStacking: boolean;
  defaultTrialDays: number;
  autoEnableForNewTeachers: boolean;
  minPlanTier: "free_trial" | "starter" | "pro" | "business";
}

export interface IPlatformAI {
  enabled: boolean;
  provider: "stub" | "openai" | "anthropic";
  defaultModel: string;
  creditsPerPlan: {
    free_trial: number;
    starter: number;
    pro: number;
    business: number;
  };
  maxRequestsPerMinute: number;
  allowChatbot: boolean;
  allowQuizGen: boolean;
  allowSummarization: boolean;
  allowContentGen: boolean;
  monthlyReset: boolean;
}

export interface IPlatformStorage {
  maxUploadMB: number;
  maxVideoUploadMB: number;
  maxFileSizeByPlan: {
    free_trial: number;
    starter: number;
    pro: number;
    business: number;
  };
  videoTranscodingEnabled: boolean;
  originalsRetentionDays: number;
  cdnProvider: "local" | "r2" | "mux" | "bunny";
}

export interface IPlatformSecurity {
  maxLoginAttempts: number;
  lockoutMinutes: number;
  require2FAForAdmins: boolean;
  require2FAForTeachers: boolean;
  sessionDurationHours: number;
  minPasswordLength: number;
  requirePasswordUppercase: boolean;
  requirePasswordNumber: boolean;
  requirePasswordSymbol: boolean;
  dataRetentionDays: number;
}

export interface IPlatformEmail {
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  dailySendLimit: number;
  unsubscribePolicy: "immediate" | "end_of_quarter";
  welcomeEnabled: boolean;
  receiptEnabled: boolean;
  reviewEnabled: boolean;
  payoutEnabled: boolean;
  marketingEnabled: boolean;
}

export interface IPlatformFeatures {
  digitalFiles: boolean;
  coaching: boolean;
  onlineChat: boolean;
  affiliateProgram: boolean;
  coupons: boolean;
  aiStudio: boolean;
  websiteBuilder: boolean;
  emailMarketing: boolean;
  formBuilder: boolean;
}

export interface IPlatformAffiliate {
  enabled: boolean;
  defaultCommissionValue: number;
  defaultCommissionValueType: "percent" | "flat";
  holdDays: number;
  minWithdrawal: number;
}

export interface IPlatformLegal {
  termsUrl: string;
  privacyUrl: string;
  refundPolicyUrl: string;
  cookiePolicyUrl: string;
  dmcaUrl: string;
  companyName: string;
  companyAddress: string;
  vatNumber: string;
  minimumAge: number;
}

export interface IPlatformSettings extends Document {
  key: string;
  general: IPlatformGeneral;
  commerce: IPlatformCommerce;
  subscriptions: IPlatformSubscriptions;
  addons: IPlatformAddons;
  ai: IPlatformAI;
  storage: IPlatformStorage;
  security: IPlatformSecurity;
  email: IPlatformEmail;
  features: IPlatformFeatures;
  affiliate: IPlatformAffiliate;
  legal: IPlatformLegal;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}