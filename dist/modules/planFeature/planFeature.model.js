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
    key: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    label: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ["boolean", "number", "text"], required: true },
    defaultValue: { type: mongoose_1.Schema.Types.Mixed, required: true },
    unit: { type: String, trim: true },
    icon: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, versionKey: false });
PlanFeatureSchema.pre("validate", function (next) {
    if (this.type === "boolean" && typeof this.defaultValue !== "boolean") {
        return next(new Error(`defaultValue must be boolean for type "boolean"`));
    }
    if (this.type === "number" && typeof this.defaultValue !== "number") {
        return next(new Error(`defaultValue must be number for type "number"`));
    }
    next();
});
const PlanFeatureModel = mongoose_1.default.model("PlanFeature", PlanFeatureSchema);
exports.default = PlanFeatureModel;
