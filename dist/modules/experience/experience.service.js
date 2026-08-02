"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExperience = createExperience;
exports.getAllExperiences = getAllExperiences;
exports.getExperienceById = getExperienceById;
exports.updateExperience = updateExperience;
exports.deleteExperience = deleteExperience;
exports.toggleExperience = toggleExperience;
exports.getActiveExperiences = getActiveExperiences;
exports.getExperienceByKey = getExperienceByKey;
exports.getExperienceAnalytics = getExperienceAnalytics;
exports.recordImpression = recordImpression;
const mongoose_1 = __importDefault(require("mongoose"));
const experience_model_1 = __importDefault(require("./experience.model"));
const experienceAnalytics_model_1 = require("./experienceAnalytics.model");
// ── helpers ───────────────────────────────────────────────────────
function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]+/g, "")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
}
function validateSchedule(schedule) {
    if (schedule?.startAt &&
        schedule?.endAt &&
        schedule.startAt > schedule.endAt) {
        throw new Error("schedule.startAt cannot be greater than endAt");
    }
}
// ── content & options validation (replaces old normalizeModules) ──
function validateContent(content) {
    if (!content)
        return;
    if (!content.resourceType) {
        throw new Error("content.resourceType is required");
    }
    if (!["form", "page"].includes(content.resourceType)) {
        throw new Error(`Invalid content.resourceType: ${content.resourceType}`);
    }
    // at least one of resourceId or resourceKey should be provided (optional for page)
}
function validateOptions(type, options) {
    if (!options)
        return;
    switch (type) {
        case "popup": {
            const o = options;
            const validPositions = [
                "center", "top", "bottom", "top-left", "top-right",
                "bottom-left", "bottom-right",
            ];
            if (o.position && !validPositions.includes(o.position)) {
                throw new Error(`Invalid popup position: ${o.position}`);
            }
            if (o.size && !["small", "medium", "large"].includes(o.size)) {
                throw new Error(`Invalid popup size: ${o.size}`);
            }
            if (o.animation && !["fade", "slide-up", "scale"].includes(o.animation)) {
                throw new Error(`Invalid popup animation: ${o.animation}`);
            }
            break;
        }
        case "banner": {
            const o = options;
            if (o.placement && !["top", "bottom"].includes(o.placement)) {
                throw new Error(`Invalid banner placement: ${o.placement}`);
            }
            if (o.animation && !["slide-down", "fade"].includes(o.animation)) {
                throw new Error(`Invalid banner animation: ${o.animation}`);
            }
            break;
        }
        case "redirect": {
            const o = options;
            if (o.delayMs && (typeof o.delayMs !== "number" || o.delayMs < 0)) {
                throw new Error("redirect options.delayMs must be a non‑negative number");
            }
            break;
        }
        case "full_page": {
            const o = options;
            if (o.layout && !["centered", "wide"].includes(o.layout)) {
                throw new Error(`Invalid full_page layout: ${o.layout}`);
            }
            break;
        }
        default:
            break;
    }
}
function validateExperiencePayload(payload) {
    validateSchedule(payload.schedule);
    if (payload.content) {
        validateContent(payload.content);
    }
    if (payload.type) {
        validateOptions(payload.type, payload.options);
    }
}
/*
|--------------------------------------------------------------------------
| Create
|--------------------------------------------------------------------------
*/
async function createExperience(payload) {
    // auto‑generate key if not provided
    if (!payload.key && payload.name) {
        payload.key = slugify(payload.name);
    }
    const existing = await experience_model_1.default.findOne({ key: payload.key });
    if (existing) {
        throw new Error(`Experience with key "${payload.key}" already exists`);
    }
    validateExperiencePayload(payload);
    const experience = await experience_model_1.default.create(payload);
    return experience;
}
/*
|--------------------------------------------------------------------------
| Get All (Admin)
|--------------------------------------------------------------------------
*/
async function getAllExperiences(filters = {}) {
    const experiences = await experience_model_1.default.find(filters)
        .sort({ priority: -1, createdAt: -1 })
        .lean();
    return experiences;
}
/*
|--------------------------------------------------------------------------
| Get By ID
|--------------------------------------------------------------------------
*/
async function getExperienceById(id) {
    return experience_model_1.default.findById(id).lean();
}
/*
|--------------------------------------------------------------------------
| Update
|--------------------------------------------------------------------------
*/
async function updateExperience(id, payload) {
    const experience = await experience_model_1.default.findById(id);
    if (!experience)
        return null;
    if (payload.key && payload.key !== experience.key) {
        const existing = await experience_model_1.default.findOne({
            key: payload.key,
            _id: { $ne: id },
        });
        if (existing) {
            throw new Error(`Experience with key "${payload.key}" already exists`);
        }
    }
    // auto‑generate key if name changed and no key provided
    if (!payload.key && payload.name && payload.name !== experience.name) {
        payload.key = slugify(payload.name);
    }
    const nextSchedule = payload.schedule ?? experience.schedule;
    validateSchedule(nextSchedule);
    if (payload.content) {
        validateContent(payload.content);
    }
    if (payload.type) {
        validateOptions(payload.type, payload.options ?? experience.options);
    }
    else if (payload.options) {
        validateOptions(experience.type, payload.options);
    }
    Object.assign(experience, payload);
    await experience.save();
    return experience.toObject();
}
/*
|--------------------------------------------------------------------------
| Delete
|--------------------------------------------------------------------------
*/
async function deleteExperience(id) {
    return experience_model_1.default.findByIdAndDelete(id).lean();
}
/*
|--------------------------------------------------------------------------
| Toggle Enable / Disable
|--------------------------------------------------------------------------
*/
async function toggleExperience(id) {
    const experience = await experience_model_1.default.findById(id);
    if (!experience)
        throw new Error("Experience not found");
    experience.enabled = !experience.enabled;
    await experience.save();
    return experience.toObject();
}
/*
|--------------------------------------------------------------------------
| Public Runtime Query
|--------------------------------------------------------------------------
| Used by frontend app/layout.tsx
|--------------------------------------------------------------------------
*/
async function getActiveExperiences() {
    const now = new Date();
    const experiences = await experience_model_1.default.find({
        enabled: true,
        $or: [
            { schedule: { $exists: false } },
            {
                "schedule.startAt": { $exists: false },
                "schedule.endAt": { $exists: false },
            },
            {
                $and: [
                    {
                        $or: [
                            { "schedule.startAt": { $exists: false } },
                            { "schedule.startAt": { $lte: now } },
                        ],
                    },
                    {
                        $or: [
                            { "schedule.endAt": { $exists: false } },
                            { "schedule.endAt": { $gte: now } },
                        ],
                    },
                ],
            },
        ],
    })
        .sort({ priority: -1 })
        .lean();
    console.log(`Active Experiences: ${experiences}`);
    return experiences;
}
/*
|--------------------------------------------------------------------------
| Get By Key
|--------------------------------------------------------------------------
*/
async function getExperienceByKey(key) {
    return experience_model_1.default.findOne({ key }).lean();
}
/*
|--------------------------------------------------------------------------
| Analytics (placeholder – extend with actual impression collection later)
|--------------------------------------------------------------------------
*/
async function getExperienceAnalytics(experienceId, options) {
    const days = options?.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const matchStage = {
        $match: {
            experience: new mongoose_1.default.Types.ObjectId(experienceId),
            createdAt: { $gte: startDate },
        },
    };
    // Totals
    const [totals] = await experienceAnalytics_model_1.ExperienceImpressionModel.aggregate([
        matchStage,
        {
            $group: {
                _id: null,
                views: { $sum: { $cond: [{ $eq: ["$action", "view"] }, 1, 0] } },
                interactions: {
                    $sum: {
                        $cond: [{ $in: ["$action", ["click", "close"]] }, 1, 0],
                    },
                },
                conversions: {
                    $sum: { $cond: [{ $eq: ["$action", "convert"] }, 1, 0] },
                },
                lastViewedAt: { $max: "$createdAt" },
            },
        },
    ]);
    // Daily breakdown
    const byDay = await experienceAnalytics_model_1.ExperienceImpressionModel.aggregate([
        matchStage,
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                views: { $sum: { $cond: [{ $eq: ["$action", "view"] }, 1, 0] } },
                interactions: {
                    $sum: {
                        $cond: [{ $in: ["$action", ["click", "close"]] }, 1, 0],
                    },
                },
                conversions: {
                    $sum: { $cond: [{ $eq: ["$action", "convert"] }, 1, 0] },
                },
            },
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                _id: 0,
                date: "$_id",
                views: 1,
                interactions: 1,
                conversions: 1,
            },
        },
    ]);
    // By device
    const byDevice = await experienceAnalytics_model_1.ExperienceImpressionModel.aggregate([
        matchStage,
        { $group: { _id: "$device", count: { $sum: 1 } } },
        { $project: { _id: 0, device: { $ifNull: ["$_id", "unknown"] }, count: 1 } },
    ]);
    // By referrer
    const byReferrer = await experienceAnalytics_model_1.ExperienceImpressionModel.aggregate([
        matchStage,
        { $group: { _id: "$referrer", count: { $sum: 1 } } },
        { $project: { _id: 0, referrer: { $ifNull: ["$_id", "direct"] }, count: 1 } },
    ]);
    const views = totals?.views || 0;
    const conversions = totals?.conversions || 0;
    return {
        totals: {
            views,
            interactions: totals?.interactions || 0,
            conversions,
        },
        conversionRate: views > 0 ? (conversions / views) * 100 : 0,
        lastViewedAt: totals?.lastViewedAt || null,
        byDay,
        byDevice,
        byReferrer,
    };
}
async function recordImpression(experienceId, action, extra) {
    return experienceAnalytics_model_1.ExperienceImpressionModel.create({
        experience: experienceId,
        action,
        sessionId: extra?.sessionId,
        device: extra?.device,
        referrer: extra?.referrer,
        metadata: extra?.metadata,
    });
}
