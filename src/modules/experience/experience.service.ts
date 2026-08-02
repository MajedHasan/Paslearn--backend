import mongoose, { FilterQuery } from "mongoose";

import ExperienceModel from "./experience.model";
import {
  IExperience,
  IExperienceSchedule,
  IExperienceContent,
  ExperienceOptions,
  IPopupOptions,
  IBannerOptions,
  IRedirectOptions,
  IFullPageOptions,
} from "./experience.interface";
import { ExperienceImpressionModel } from "./experienceAnalytics.model";

// ── helpers ───────────────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function validateSchedule(schedule?: IExperienceSchedule) {
  if (
    schedule?.startAt &&
    schedule?.endAt &&
    schedule.startAt > schedule.endAt
  ) {
    throw new Error("schedule.startAt cannot be greater than endAt");
  }
}

// ── content & options validation (replaces old normalizeModules) ──
function validateContent(content?: IExperienceContent) {
  if (!content) return;
  if (!content.resourceType) {
    throw new Error("content.resourceType is required");
  }
  if (!["form", "page"].includes(content.resourceType)) {
    throw new Error(`Invalid content.resourceType: ${content.resourceType}`);
  }
  // at least one of resourceId or resourceKey should be provided (optional for page)
}

function validateOptions(type: IExperience["type"], options?: ExperienceOptions) {
  if (!options) return;
  switch (type) {
    case "popup": {
      const o = options as IPopupOptions;
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
      const o = options as IBannerOptions;
      if (o.placement && !["top", "bottom"].includes(o.placement)) {
        throw new Error(`Invalid banner placement: ${o.placement}`);
      }
      if (o.animation && !["slide-down", "fade"].includes(o.animation)) {
        throw new Error(`Invalid banner animation: ${o.animation}`);
      }
      break;
    }
    case "redirect": {
      const o = options as IRedirectOptions;
      if (o.delayMs && (typeof o.delayMs !== "number" || o.delayMs < 0)) {
        throw new Error("redirect options.delayMs must be a non‑negative number");
      }
      break;
    }
    case "full_page": {
      const o = options as IFullPageOptions;
      if (o.layout && !["centered", "wide"].includes(o.layout)) {
        throw new Error(`Invalid full_page layout: ${o.layout}`);
      }
      break;
    }
    default:
      break;
  }
}

function validateExperiencePayload(payload: Partial<IExperience>) {
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
export async function createExperience(
  payload: Partial<IExperience>,
): Promise<IExperience> {
  // auto‑generate key if not provided
  if (!payload.key && payload.name) {
    payload.key = slugify(payload.name);
  }

  const existing = await ExperienceModel.findOne({ key: payload.key });
  if (existing) {
    throw new Error(`Experience with key "${payload.key}" already exists`);
  }

  validateExperiencePayload(payload);

  const experience = await ExperienceModel.create(payload);
  return experience;
}

/*
|--------------------------------------------------------------------------
| Get All (Admin)
|--------------------------------------------------------------------------
*/
export async function getAllExperiences(
  filters: FilterQuery<IExperience> = {},
): Promise<IExperience[]> {
  const experiences = await ExperienceModel.find(filters)
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  return experiences as IExperience[];
}

/*
|--------------------------------------------------------------------------
| Get By ID
|--------------------------------------------------------------------------
*/
export async function getExperienceById(
  id: string,
): Promise<IExperience | null> {
  return ExperienceModel.findById(id).lean();
}

/*
|--------------------------------------------------------------------------
| Update
|--------------------------------------------------------------------------
*/
export async function updateExperience(
  id: string,
  payload: Partial<IExperience>,
): Promise<IExperience | null> {
  const experience = await ExperienceModel.findById(id);
  if (!experience) return null;

  if (payload.key && payload.key !== experience.key) {
    const existing = await ExperienceModel.findOne({
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
  validateSchedule(nextSchedule as IExperienceSchedule);

  if (payload.content) {
    validateContent(payload.content);
  }
  if (payload.type) {
    validateOptions(payload.type, payload.options ?? experience.options);
  } else if (payload.options) {
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
export async function deleteExperience(
  id: string,
): Promise<IExperience | null> {
  return ExperienceModel.findByIdAndDelete(id).lean();
}

/*
|--------------------------------------------------------------------------
| Toggle Enable / Disable
|--------------------------------------------------------------------------
*/
export async function toggleExperience(
  id: string,
): Promise<IExperience | null> {
  const experience = await ExperienceModel.findById(id);
  if (!experience) throw new Error("Experience not found");

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
export async function getActiveExperiences(): Promise<IExperience[]> {
  const now = new Date();

  const experiences = await ExperienceModel.find({
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
  
  console.log(`Active Experiences: ${experiences}`)
  
  return experiences as IExperience[];
}

/*
|--------------------------------------------------------------------------
| Get By Key
|--------------------------------------------------------------------------
*/
export async function getExperienceByKey(
  key: string,
): Promise<IExperience | null> {
  return ExperienceModel.findOne({ key }).lean();
}

/*
|--------------------------------------------------------------------------
| Analytics (placeholder – extend with actual impression collection later)
|--------------------------------------------------------------------------
*/
export async function getExperienceAnalytics(
  experienceId: string,
  options?: { days?: number }
): Promise<{
  totals: { views: number; interactions: number; conversions: number };
  conversionRate: number;
  lastViewedAt: Date | null;
  byDay: { date: string; views: number; interactions: number; conversions: number }[];
  byDevice: { device: string; count: number }[];
  byReferrer: { referrer: string; count: number }[];
}> {
  const days = options?.days || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const matchStage = {
    $match: {
      experience: new mongoose.Types.ObjectId(experienceId),
      createdAt: { $gte: startDate },
    },
  };

  // Totals
  const [totals] = await ExperienceImpressionModel.aggregate([
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
  const byDay = await ExperienceImpressionModel.aggregate([
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
  const byDevice = await ExperienceImpressionModel.aggregate([
    matchStage,
    { $group: { _id: "$device", count: { $sum: 1 } } },
    { $project: { _id: 0, device: { $ifNull: ["$_id", "unknown"] }, count: 1 } },
  ]);

  // By referrer
  const byReferrer = await ExperienceImpressionModel.aggregate([
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



export async function recordImpression(
  experienceId: string,
  action: "view" | "click" | "close" | "convert",
  extra?: { sessionId?: string; device?: string; referrer?: string; metadata?: Record<string, any> }
) {
  return ExperienceImpressionModel.create({
    experience: experienceId,
    action,
    sessionId: extra?.sessionId,
    device: extra?.device,
    referrer: extra?.referrer,
    metadata: extra?.metadata,
  });
}