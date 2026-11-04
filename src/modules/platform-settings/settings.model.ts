// src/modules/platform-settings/settings.model.ts
import { Schema, model } from "mongoose";
import { IPlatformSettings } from "./settings.interface";

const generalSchema = new Schema({
  siteName:           { type: String, default: "Paslearn" },
  siteTagline:        { type: String, default: "Learn from world-class instructors" },
  siteUrl:            { type: String, default: "https://paslearn.com" },
  supportEmail:       { type: String, default: "support@paslearn.com" },
  logoUrl:            { type: String, default: "" },
  faviconUrl:         { type: String, default: "" },
  maintenanceMode:    { type: Boolean, default: false },
  maintenanceMessage: { type: String, default: "Scheduled maintenance in progress." },
}, { _id: false });

const commerceSchema = new Schema({
  platformFeePercent: { type: Number, default: 10, min: 0, max: 50 },
  minPayoutAmount:    { type: Number, default: 50, min: 0 },
  payoutSchedule:     { type: String, enum: ["manual", "auto"], default: "manual" },
  defaultCurrency:    { type: String, default: "USD", uppercase: true },
  taxEnabled:         { type: Boolean, default: false },
  taxPercent:         { type: Number, default: 0, min: 0, max: 100 },
}, { _id: false });

const subscriptionsSchema = new Schema({
  freeTrialDays:        { type: Number, default: 14, min: 0 },
  gracePeriodDays:      { type: Number, default: 3, min: 0 },
  autoRenewByDefault:   { type: Boolean, default: true },
  allowUpgrade:         { type: Boolean, default: true },
  allowDowngrade:       { type: Boolean, default: true },
  prorateOnUpgrade:     { type: Boolean, default: true },
  cancelAtPeriodEnd:    { type: Boolean, default: true },
  refundWindowDays:     { type: Number, default: 7, min: 0 },
  requiresApproval:     { type: Boolean, default: false },
}, { _id: false });

const addonsSchema = new Schema({
  enabled:                  { type: Boolean, default: true },
  allowStacking:            { type: Boolean, default: true },
  defaultTrialDays:         { type: Number, default: 0, min: 0 },
  autoEnableForNewTeachers: { type: Boolean, default: false },
  minPlanTier:              { type: String, enum: ["free_trial", "starter", "pro", "business"], default: "free_trial" },
}, { _id: false });

const aiSchema = new Schema({
  enabled:    { type: Boolean, default: true },
  provider:   { type: String, enum: ["stub", "openai", "anthropic"], default: "stub" },
  defaultModel: { type: String, default: "gpt-4o-mini" },
  creditsPerPlan: {
    free_trial: { type: Number, default: 50, min: 0 },
    starter:    { type: Number, default: 500, min: 0 },
    pro:        { type: Number, default: 2000, min: 0 },
    business:   { type: Number, default: 10000, min: 0 },
  },
  maxRequestsPerMinute: { type: Number, default: 10, min: 1 },
  allowChatbot:         { type: Boolean, default: true },
  allowQuizGen:         { type: Boolean, default: true },
  allowSummarization:   { type: Boolean, default: true },
  allowContentGen:      { type: Boolean, default: true },
  monthlyReset:         { type: Boolean, default: true },
}, { _id: false });

const storageSchema = new Schema({
  maxUploadMB:              { type: Number, default: 25, min: 1 },
  maxVideoUploadMB:         { type: Number, default: 500, min: 1 },
  maxFileSizeByPlan: {
    free_trial: { type: Number, default: 25, min: 1 },
    starter:    { type: Number, default: 100, min: 1 },
    pro:        { type: Number, default: 500, min: 1 },
    business:   { type: Number, default: 2000, min: 1 },
  },
  videoTranscodingEnabled:  { type: Boolean, default: true },
  originalsRetentionDays:   { type: Number, default: 90, min: 0 },
  cdnProvider:              { type: String, enum: ["local", "r2", "mux", "bunny"], default: "r2" },
}, { _id: false });

const securitySchema = new Schema({
  maxLoginAttempts:         { type: Number, default: 5, min: 1 },
  lockoutMinutes:           { type: Number, default: 15, min: 1 },
  require2FAForAdmins:      { type: Boolean, default: false },
  require2FAForTeachers:    { type: Boolean, default: false },
  sessionDurationHours:     { type: Number, default: 24, min: 1 },
  minPasswordLength:        { type: Number, default: 8, min: 6 },
  requirePasswordUppercase: { type: Boolean, default: false },
  requirePasswordNumber:    { type: Boolean, default: true },
  requirePasswordSymbol:    { type: Boolean, default: false },
  dataRetentionDays:        { type: Number, default: 365, min: 0 },
}, { _id: false });

const emailSchema = new Schema({
  fromName:          { type: String, default: "Paslearn" },
  fromEmail:         { type: String, default: "no-reply@paslearn.com" },
  replyToEmail:      { type: String, default: "support@paslearn.com" },
  dailySendLimit:    { type: Number, default: 5000, min: 0 },
  unsubscribePolicy: { type: String, enum: ["immediate", "end_of_quarter"], default: "immediate" },
  welcomeEnabled:    { type: Boolean, default: true },
  receiptEnabled:    { type: Boolean, default: true },
  reviewEnabled:     { type: Boolean, default: true },
  payoutEnabled:     { type: Boolean, default: true },
  marketingEnabled:  { type: Boolean, default: false },
}, { _id: false });

const featuresSchema = new Schema({
  digitalFiles:     { type: Boolean, default: true },
  coaching:         { type: Boolean, default: true },
  onlineChat:       { type: Boolean, default: false },
  affiliateProgram: { type: Boolean, default: true },
  coupons:          { type: Boolean, default: true },
  aiStudio:         { type: Boolean, default: true },
  websiteBuilder:   { type: Boolean, default: false },
  emailMarketing:   { type: Boolean, default: false },
  formBuilder:      { type: Boolean, default: false },
}, { _id: false });

const affiliateSchema = new Schema({
  enabled:                    { type: Boolean, default: true },
  defaultCommissionValue:     { type: Number, default: 20, min: 0 },
  defaultCommissionValueType: { type: String, enum: ["percent", "flat"], default: "percent" },
  holdDays:                   { type: Number, default: 7, min: 0 },
  minWithdrawal:              { type: Number, default: 50, min: 0 },
}, { _id: false });

const legalSchema = new Schema({
  termsUrl:        { type: String, default: "/terms" },
  privacyUrl:      { type: String, default: "/privacy" },
  refundPolicyUrl: { type: String, default: "/refund-policy" },
  cookiePolicyUrl: { type: String, default: "/cookies" },
  dmcaUrl:         { type: String, default: "/dmca" },
  companyName:     { type: String, default: "" },
  companyAddress:  { type: String, default: "" },
  vatNumber:       { type: String, default: "" },
  minimumAge:      { type: Number, default: 13, min: 0 },
}, { _id: false });

const platformSettingsSchema = new Schema<IPlatformSettings>({
  key:          { type: String, required: true, unique: true, default: "platform" },
  general:      { type: generalSchema,       default: () => ({}) },
  commerce:     { type: commerceSchema,      default: () => ({}) },
  subscriptions:{ type: subscriptionsSchema, default: () => ({}) },
  addons:       { type: addonsSchema,        default: () => ({}) },
  ai:           { type: aiSchema,            default: () => ({}) },
  storage:      { type: storageSchema,       default: () => ({}) },
  security:     { type: securitySchema,      default: () => ({}) },
  email:        { type: emailSchema,         default: () => ({}) },
  features:     { type: featuresSchema,      default: () => ({}) },
  affiliate:    { type: affiliateSchema,     default: () => ({}) },
  legal:        { type: legalSchema,         default: () => ({}) },
  updatedBy:    { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default model<IPlatformSettings>("PlatformSettings", platformSettingsSchema);