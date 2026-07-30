import { FilterQuery } from "mongoose";

import ExperienceModel from "./experience.model";
import {
  IExperience,
  IExperienceModule,
  IExperienceSchedule,
} from "./experience.interface";

function validateSchedule(schedule?: IExperienceSchedule) {
  if (
    schedule?.startAt &&
    schedule?.endAt &&
    schedule.startAt > schedule.endAt
  ) {
    throw new Error("schedule.startAt cannot be greater than endAt");
  }
}

function normalizeModules(modules?: IExperienceModule[]) {
  if (!modules) return [];

  if (!Array.isArray(modules)) {
    throw new Error("modules must be an array");
  }

  const seen = new Set<string>();

  return modules.map((module, index) => {
    if (!module?.type) {
      throw new Error(`modules[${index}].type is required`);
    }

    if (!module?.key) {
      throw new Error(`modules[${index}].key is required`);
    }

    const signature = `${module.type}:${module.key}`;
    if (seen.has(signature)) {
      throw new Error(`Duplicate module detected: "${signature}"`);
    }

    seen.add(signature);

    return {
      type: module.type,
      key: String(module.key).trim(),
      config:
        module.config && typeof module.config === "object" ? module.config : {},
    };
  });
}

function validateExperiencePayload(payload: Partial<IExperience>) {
  validateSchedule(payload.schedule);

  if (payload.modules) {
    normalizeModules(payload.modules);
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
  const existing = await ExperienceModel.findOne({
    key: payload.key,
  });

  if (existing) {
    throw new Error(`Experience with key "${payload.key}" already exists`);
  }

  validateExperiencePayload(payload);

  const experience = await ExperienceModel.create({
    ...payload,
    modules: normalizeModules(payload.modules),
  });

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
    .sort({
      priority: -1,
      createdAt: -1,
    })
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

  if (!experience) {
    return null;
  }

  if (payload.key && payload.key !== experience.key) {
    const existing = await ExperienceModel.findOne({
      key: payload.key,
      _id: { $ne: id },
    });

    if (existing) {
      throw new Error(`Experience with key "${payload.key}" already exists`);
    }
  }

  const nextSchedule = payload.schedule ?? experience.schedule;
  validateSchedule(nextSchedule as IExperienceSchedule);

  if (payload.modules) {
    payload.modules = normalizeModules(payload.modules);
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

  if (!experience) {
    throw new Error("Experience not found");
  }

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
      {
        schedule: {
          $exists: false,
        },
      },

      {
        "schedule.startAt": {
          $exists: false,
        },
        "schedule.endAt": {
          $exists: false,
        },
      },

      {
        $and: [
          {
            $or: [
              {
                "schedule.startAt": {
                  $exists: false,
                },
              },
              {
                "schedule.startAt": {
                  $lte: now,
                },
              },
            ],
          },

          {
            $or: [
              {
                "schedule.endAt": {
                  $exists: false,
                },
              },
              {
                "schedule.endAt": {
                  $gte: now,
                },
              },
            ],
          },
        ],
      },
    ],
  })
    .sort({
      priority: -1,
    })
    .lean();

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
  return ExperienceModel.findOne({
    key,
  }).lean();
}
