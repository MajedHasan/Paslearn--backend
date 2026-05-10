import { FilterQuery } from "mongoose";

import ExperienceModel from "./experience.model";
import { IExperience } from "./experience.interface";

class ExperienceService {
  /*
   |--------------------------------------------------------------------------
   | Create
   |--------------------------------------------------------------------------
   */
  async createExperience(payload: Partial<IExperience>): Promise<IExperience> {
    const existing = await ExperienceModel.findOne({
      key: payload.key,
    });

    if (existing) {
      throw new Error(`Experience with key "${payload.key}" already exists`);
    }

    const experience = await ExperienceModel.create(payload);

    return experience;
  }

  /*
   |--------------------------------------------------------------------------
   | Get All (Admin)
   |--------------------------------------------------------------------------
   */
  async getAllExperiences(
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
  async getExperienceById(id: string): Promise<IExperience | null> {
    return ExperienceModel.findById(id).lean();
  }

  /*
   |--------------------------------------------------------------------------
   | Update
   |--------------------------------------------------------------------------
   */
  async updateExperience(
    id: string,
    payload: Partial<IExperience>,
  ): Promise<IExperience | null> {
    const experience = await ExperienceModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).lean();

    return experience;
  }

  /*
   |--------------------------------------------------------------------------
   | Delete
   |--------------------------------------------------------------------------
   */
  async deleteExperience(id: string): Promise<IExperience | null> {
    return ExperienceModel.findByIdAndDelete(id).lean();
  }

  /*
   |--------------------------------------------------------------------------
   | Toggle Enable / Disable
   |--------------------------------------------------------------------------
   */
  async toggleExperience(id: string): Promise<IExperience | null> {
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
  async getActiveExperiences(): Promise<IExperience[]> {
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
  async getExperienceByKey(key: string): Promise<IExperience | null> {
    return ExperienceModel.findOne({
      key,
    }).lean();
  }
}

export default new ExperienceService();
