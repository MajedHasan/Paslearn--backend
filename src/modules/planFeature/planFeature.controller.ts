import { Request, Response, NextFunction } from "express";
import {
  createFeature,
  getAllFeatures,
  getFeatureById,
  updateFeature,
  deleteFeature,
} from "./planFeature.service";

export async function createFeatureController(req: Request, res: Response, next: NextFunction) {
  try {
    const feature = await createFeature(req.body);
    return res.status(201).json({ success: true, message: "Feature created", data: feature });
  } catch (error) {
    next(error);
  }
}

export async function getAllFeaturesController(req: Request, res: Response, next: NextFunction) {
  try {
    const features = await getAllFeatures(req.query as Record<string, any>);
    return res.status(200).json({ success: true, data: features });
  } catch (error) {
    next(error);
  }
}

export async function getFeatureByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const feature = await getFeatureById(req.params.id);
    if (!feature) return res.status(404).json({ success: false, message: "Feature not found" });
    return res.status(200).json({ success: true, data: feature });
  } catch (error) {
    next(error);
  }
}

export async function updateFeatureController(req: Request, res: Response, next: NextFunction) {
  try {
    const feature = await updateFeature(req.params.id, req.body);
    if (!feature) return res.status(404).json({ success: false, message: "Feature not found" });
    return res.status(200).json({ success: true, message: "Feature updated", data: feature });
  } catch (error) {
    next(error);
  }
}

export async function deleteFeatureController(req: Request, res: Response, next: NextFunction) {
  try {
    const feature = await deleteFeature(req.params.id);
    if (!feature) return res.status(404).json({ success: false, message: "Feature not found" });
    return res.status(200).json({ success: true, message: "Feature deleted" });
  } catch (error) {
    next(error);
  }
}