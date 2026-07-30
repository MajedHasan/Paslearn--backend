import { Request, Response, NextFunction } from "express";

import {
  createExperience,
  deleteExperience,
  getActiveExperiences,
  getAllExperiences,
  getExperienceById,
  getExperienceByKey,
  toggleExperience,
  updateExperience,
} from "./experience.service";

/*
|--------------------------------------------------------------------------
| Create Experience
|--------------------------------------------------------------------------
*/
export async function createExperienceController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const experience = await createExperience(req.body);

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
export async function getAllExperiencesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const experiences = await getAllExperiences(
      req.query as Record<string, any>,
    );

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
export async function getExperienceByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;

    const experience = await getExperienceById(id);

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
export async function updateExperienceController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;

    const experience = await updateExperience(id, req.body);

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
export async function deleteExperienceController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;

    const experience = await deleteExperience(id);

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
export async function toggleExperienceController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;

    const experience = await toggleExperience(id);

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
*/
export async function getActiveExperiencesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const experiences = await getActiveExperiences();

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
export async function getExperienceByKeyController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { key } = req.params;

    const experience = await getExperienceByKey(key);

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
