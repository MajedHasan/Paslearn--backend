import { Request, Response, NextFunction } from "express";
import { 
createThemeCategory,
getAllThemeCategories,
getThemeCategoryById,
updateThemeCategory,
deleteThemeCategory,        
} from "./themeCategory.service";
 
export async function createThemeCategoryController(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await createThemeCategory(req.body);
    return res.status(201).json({ success: true, message: "Theme category created", data: category });
  } catch (error) {
    next(error);
  }
}

export async function getAllThemeCategoriesController(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await getAllThemeCategories();
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

export async function getThemeCategoryByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await getThemeCategoryById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Theme category not found" });
    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function updateThemeCategoryController(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await updateThemeCategory(req.params.id, req.body);
    if (!category) return res.status(404).json({ success: false, message: "Theme category not found" });
    return res.status(200).json({ success: true, message: "Theme category updated", data: category });
  } catch (error) {
    next(error);
  }
}

export async function deleteThemeCategoryController(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await deleteThemeCategory(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Theme category not found" });
    return res.status(200).json({ success: true, message: "Theme category deleted", data: category });
  } catch (error) {
    next(error);
  }
}   