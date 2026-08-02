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
const PlanFeatureSchema = new mongoose_1.Schema({
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ["boolean", "number", "text"], required: true },
    value: { type: mongoose_1.Schema.Types.Mixed, required: true },
    tooltip: { type: String, trim: true },
    icon: { type: String, trim: true },
}, { _id: false });
const PriceSchema = new mongoose_1.Schema({
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD", uppercase: true, trim: true },
    billingCycle: {
        type: String,
        enum: ["monthly", "yearly", "lifetime"],
        required: true,
    },
}, { _id: false });
const LimitsSchema = new mongoose_1.Schema({
    maxCourses: { type: Number, default: 0 },
    maxStudents: { type: Number, default: 0 },
    maxTemplates: { type: Number, default: 0 },
    maxLandingPages: { type: Number, default: 0 },
    maxForms: { type: Number, default: 0 },
    maxAutomations: { type: Number, default: 0 },
    maxSalesPages: { type: Number, default: 0 },
    maxFunnels: { type: Number, default: 0 },
    maxEmailCampaigns: { type: Number, default: 0 },
    maxDigitalProducts: { type: Number, default: 0 },
    maxCoachingClients: { type: Number, default: 0 },
    maxCourseEnrollments: { type: Number, default: 0 },
    certificateEnabled: { type: Boolean, default: false },
    jobBoardAccess: { type: Boolean, default: false },
    aiCredits: { type: Number, default: 0 },
}, { _id: false });
const PlanSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    description: { type: String, default: "" },
    icon: { type: String, trim: true },
    badge: { type: String, trim: true },
    ctaText: { type: String, trim: true },
    ctaUrl: { type: String, trim: true },
    price: { type: PriceSchema, required: true },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0, index: true },
    features: { type: [PlanFeatureSchema], default: [] },
    limits: { type: LimitsSchema, default: () => ({}) },
    applicableTo: {
        type: [String],
        enum: ["teacher", "student", "affiliate", "all"],
        default: ["teacher", "student"],
        validate: {
            validator: function (v) {
                return v.length > 0;
            },
            message: "At least one target audience is required.",
        },
    },
}, {
    timestamps: true,
    versionKey: false,
});
PlanSchema.index({ isActive: 1, sortOrder: 1 });
PlanSchema.pre("validate", function (next) {
    if (this.features && this.features.length > 0) {
        for (const feature of this.features) {
            if (feature.type === "boolean" && typeof feature.value !== "boolean") {
                return next(new Error(`Feature "${feature.key}" value must be a boolean`));
            }
            if (feature.type === "number" && typeof feature.value !== "number") {
                return next(new Error(`Feature "${feature.key}" value must be a number`));
            }
        }
    }
    next();
});
const PlanModel = mongoose_1.default.model("Plan", PlanSchema);
exports.default = PlanModel;
