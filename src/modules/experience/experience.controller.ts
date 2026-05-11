import { Request, Response, NextFunction } from "express";

import ExperienceService from "./experience.service";

class ExperienceController {
  /*
   |--------------------------------------------------------------------------
   | Create Experience
   |--------------------------------------------------------------------------
   */
  async createExperience(req: Request, res: Response, next: NextFunction) {
    try {
      const experience = await ExperienceService.createExperience(req.body);

      return res.status(201).json({
        success: true,
        message: "Experience created successfully",
        data: experience,
      });
    } catch (error) {
      next(error);
    }
  }

  /*
   |--------------------------------------------------------------------------
   | Get All Experiences (Admin)
   |--------------------------------------------------------------------------
   */
  async getAllExperiences(req: Request, res: Response, next: NextFunction) {
    try {
      const experiences = await ExperienceService.getAllExperiences();

      return res.status(200).json({
        success: true,
        data: experiences,
      });
    } catch (error) {
      next(error);
    }
  }

  /*
   |--------------------------------------------------------------------------
   | Get Single Experience
   |--------------------------------------------------------------------------
   */
  async getExperienceById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const experience = await ExperienceService.getExperienceById(id);

      if (!experience) {
        return res.status(404).json({
          success: false,
          message: "Experience not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: experience,
      });
    } catch (error) {
      next(error);
    }
  }

  /*
   |--------------------------------------------------------------------------
   | Update Experience
   |--------------------------------------------------------------------------
   */
  async updateExperience(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const experience = await ExperienceService.updateExperience(id, req.body);

      if (!experience) {
        return res.status(404).json({
          success: false,
          message: "Experience not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Experience updated successfully",
        data: experience,
      });
    } catch (error) {
      next(error);
    }
  }

  /*
   |--------------------------------------------------------------------------
   | Delete Experience
   |--------------------------------------------------------------------------
   */
  async deleteExperience(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const experience = await ExperienceService.deleteExperience(id);

      if (!experience) {
        return res.status(404).json({
          success: false,
          message: "Experience not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Experience deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /*
   |--------------------------------------------------------------------------
   | Toggle Experience
   |--------------------------------------------------------------------------
   */
  async toggleExperience(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const experience = await ExperienceService.toggleExperience(id);

      return res.status(200).json({
        success: true,
        message: "Experience status updated successfully",
        data: experience,
      });
    } catch (error) {
      next(error);
    }
  }

  /*
   |--------------------------------------------------------------------------
   | Public Runtime Experiences
   |--------------------------------------------------------------------------
   | Used by frontend app/layout.tsx
   |--------------------------------------------------------------------------
   */
  async getActiveExperiences(req: Request, res: Response, next: NextFunction) {
    try {
      const experiences = await ExperienceService.getActiveExperiences();

      return res.status(200).json({
        success: true,
        data: experiences,
      });
    } catch (error) {
      console.error("Experience fetch failed:", error);

      next(error);
    }
  }

  /*
   |--------------------------------------------------------------------------
   | Get Experience By Key
   |--------------------------------------------------------------------------
   */
  async getExperienceByKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;

      const experience = await ExperienceService.getExperienceByKey(key);

      if (!experience) {
        return res.status(404).json({
          success: false,
          message: "Experience not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: experience,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ExperienceController();
