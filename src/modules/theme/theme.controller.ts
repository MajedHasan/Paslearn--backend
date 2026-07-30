import { Request, Response, NextFunction } from "express";
import {
  createTheme,
  getAllThemes,
  getActiveThemes,
  getThemeById,
  getThemeBySlug,
  updateTheme,
  deleteTheme,
  toggleThemeActive,
} from "./theme.service";

export async function createThemeController(req: Request, res: Response, next: NextFunction) {
  try {
    const theme = await createTheme(req.body);
    return res.status(201).json({ success: true, message: "Theme created", data: theme });
  } catch (error) {
    next(error);
  }
}

export async function getAllThemesController(req: Request, res: Response, next: NextFunction) {
  try {
    const themes = await getAllThemes(req.query as Record<string, any>);
    return res.status(200).json({ success: true, data: themes });
  } catch (error) {
    next(error);
  }
}

export async function getActiveThemesController(req: Request, res: Response, next: NextFunction) {
  try {
    const themes = await getActiveThemes();
    return res.status(200).json({ success: true, data: themes });
  } catch (error) {
    next(error);
  }
}

export async function getThemeByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const theme = await getThemeById(req.params.id);
    if (!theme) return res.status(404).json({ success: false, message: "Theme not found" });
    return res.status(200).json({ success: true, data: theme });
  } catch (error) {
    next(error);
  }
}

export async function getThemeBySlugController(req: Request, res: Response, next: NextFunction) {
  try {
    const theme = await getThemeBySlug(req.params.slug);
    if (!theme) return res.status(404).json({ success: false, message: "Theme not found" });
    return res.status(200).json({ success: true, data: theme });
  } catch (error) {
    next(error);
  }
}

export async function updateThemeController(req: Request, res: Response, next: NextFunction) {
  try {
    const theme = await updateTheme(req.params.id, req.body);
    if (!theme) return res.status(404).json({ success: false, message: "Theme not found" });
    return res.status(200).json({ success: true, message: "Theme updated", data: theme });
  } catch (error) {
    next(error);
  }
}

export async function deleteThemeController(req: Request, res: Response, next: NextFunction) {
  try {
    const theme = await deleteTheme(req.params.id);
    if (!theme) return res.status(404).json({ success: false, message: "Theme not found" });
    return res.status(200).json({ success: true, message: "Theme deleted" });
  } catch (error) {
    next(error);
  }
}

export async function toggleThemeActiveController(req: Request, res: Response, next: NextFunction) {
  try {
    const theme = await toggleThemeActive(req.params.id);
    return res.status(200).json({
      success: true,
      message: `Theme ${theme?.isActive ? "activated" : "deactivated"}`,
      data: theme,
    });
  } catch (error) {
    next(error);
  }
}