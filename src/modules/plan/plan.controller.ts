import { Request, Response, NextFunction } from "express";
import {
  createPlan,
  getAllPlans,
  getActivePlans,
  getPlanById,
  getPlanBySlug,
  updatePlan,
  deletePlan,
  togglePlanActive,
} from "./plan.service";

export async function createPlanController(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await createPlan(req.body);
    return res.status(201).json({ success: true, message: "Plan created", data: plan });
  } catch (error) {
    next(error);
  }
}

export async function getAllPlansController(req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await getAllPlans(req.query as Record<string, any>);
    return res.status(200).json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
}

export async function getActivePlansController(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.query.role as string | undefined;
    const plans = await getActivePlans(role);
    return res.status(200).json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
}

export async function getPlanByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await getPlanById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    return res.status(200).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
}

export async function getPlanBySlugController(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await getPlanBySlug(req.params.slug);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    return res.status(200).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
}

export async function updatePlanController(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await updatePlan(req.params.id, req.body);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    return res.status(200).json({ success: true, message: "Plan updated", data: plan });
  } catch (error) {
    next(error);
  }
}

export async function deletePlanController(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await deletePlan(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    return res.status(200).json({ success: true, message: "Plan deleted" });
  } catch (error) {
    next(error);
  }
}

export async function togglePlanActiveController(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await togglePlanActive(req.params.id);
    return res.status(200).json({
      success: true,
      message: `Plan ${plan!.isActive ? "activated" : "deactivated"}`,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
}