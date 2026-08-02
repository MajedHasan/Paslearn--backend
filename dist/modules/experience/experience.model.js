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
// ── Content sub‑schema ──────────────────────────────────
const ContentSchema = new mongoose_1.Schema({
    resourceType: {
        type: String,
        enum: ["form", "page"],
        required: true,
    },
    resourceId: {
        type: mongoose_1.Schema.Types.ObjectId,
    },
    resourceKey: {
        type: String,
        trim: true,
    },
    titleOverride: {
        type: String,
        trim: true,
    },
}, { _id: false });
// ── Main Experience Schema ──────────────────────────────
const ExperienceSchema = new mongoose_1.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ["full_page", "popup", "banner", "redirect"],
        required: true,
        index: true,
    },
    enabled: {
        type: Boolean,
        default: false,
        index: true,
    },
    priority: {
        type: Number,
        default: 0,
        index: true,
    },
    target: {
        scope: {
            type: String,
            enum: ["global", "routes"],
            required: true,
        },
        routes: [{ type: String, trim: true }],
        excludeRoutes: [{ type: String, trim: true }],
    },
    trigger: {
        type: {
            type: String,
            enum: ["always", "timer", "exit_intent", "scroll", "custom_event"],
            default: "always",
        },
        value: mongoose_1.Schema.Types.Mixed,
    },
    schedule: {
        startAt: Date,
        endAt: Date,
    },
    content: {
        type: ContentSchema,
        default: undefined,
    },
    options: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    payload: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
    versionKey: false,
});
// ── Indexes ──────────────────────────────────────────────
ExperienceSchema.index({ enabled: 1, type: 1, priority: -1 });
// ── Pre‑save validation ─────────────────────────────────
ExperienceSchema.pre("save", function (next) {
    if (this.schedule?.startAt &&
        this.schedule?.endAt &&
        this.schedule.startAt > this.schedule.endAt) {
        return next(new Error("schedule.startAt cannot be greater than endAt"));
    }
    next();
});
const ExperienceModel = mongoose_1.default.model("Experience", ExperienceSchema);
exports.default = ExperienceModel;
