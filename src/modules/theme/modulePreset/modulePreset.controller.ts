import { Request, Response, NextFunction } from "express";
import { 
createModulePreset,
getAllModulePresets,
getModulePresetById,
updateModulePreset,
deleteModulePreset,
} from "./modulePreset.service"
 
export async function createModulePresetController(req: Request, res: Response, next: NextFunction) {
  try {
    const preset = await createModulePreset(req.body);
    return res.status(201).json({ success: true, message: "Module preset created", data: preset });
  } catch (error) {
    next(error);
  }
}

export async function getAllModulePresetsController(req: Request, res: Response, next: NextFunction) {
  try {
    const presets = await getAllModulePresets(req.query as Record<string, any>);
    return res.status(200).json({ success: true, data: presets });
  } catch (error) {
    next(error);
  }
}

export async function getModulePresetByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const preset = await getModulePresetById(req.params.id);
    if (!preset) return res.status(404).json({ success: false, message: "Module preset not found" });
    return res.status(200).json({ success: true, data: preset });
  } catch (error) {
    next(error);
  }
}

export async function updateModulePresetController(req: Request, res: Response, next: NextFunction) {
  try {
    const preset = await updateModulePreset(req.params.id, req.body);
    if (!preset) return res.status(404).json({ success: false, message: "Module preset not found" });
    return res.status(200).json({ success: true, message: "Module preset updated", data: preset });
  } catch (error) {
    next(error);
  }
}

export async function deleteModulePresetController(req: Request, res: Response, next: NextFunction) {
  try {
    const preset = await deleteModulePreset(req.params.id);
    if (!preset) return res.status(404).json({ success: false, message: "Module preset not found" });
    return res.status(200).json({ success: true, message: "Module preset deleted", data: preset });
  } catch (error) {
    next(error);
  }
}