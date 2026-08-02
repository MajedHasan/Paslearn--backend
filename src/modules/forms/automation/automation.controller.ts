import { Request, Response, NextFunction } from "express";
import {
  createAutomation,
  getAllAutomations,
  getAutomationById,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
} from "./automation.service";

export async function createAutomationController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const automation = await createAutomation(req.body);
    return res
      .status(201)
      .json({ success: true, message: "Automation created", data: automation });
  } catch (error) {
    next(error);
  }
}

export async function getAllAutomationsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const automations = await getAllAutomations(req.query as Record<string, any>);
    return res.status(200).json({ success: true, data: automations });
  } catch (error) {
    next(error);
  }
}

export async function getAutomationByIdController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const automation = await getAutomationById(req.params.id);
    if (!automation)
      return res
        .status(404)
        .json({ success: false, message: "Automation not found" });
    return res.status(200).json({ success: true, data: automation });
  } catch (error) {
    next(error);
  }
}

export async function updateAutomationController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const automation = await updateAutomation(req.params.id, req.body);
    if (!automation)
      return res
        .status(404)
        .json({ success: false, message: "Automation not found" });
    return res
      .status(200)
      .json({ success: true, message: "Automation updated", data: automation });
  } catch (error) {
    next(error);
  }
}

export async function deleteAutomationController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const automation = await deleteAutomation(req.params.id);
    if (!automation)
      return res
        .status(404)
        .json({ success: false, message: "Automation not found" });
    return res
      .status(200)
      .json({ success: true, message: "Automation deleted" });
  } catch (error) {
    next(error);
  }
}

export async function toggleAutomationController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const automation = await toggleAutomation(req.params.id);
    return res.status(200).json({
      success: true,
      message: `Automation ${automation.enabled ? "enabled" : "disabled"}`,
      data: automation,
    });
  } catch (error) {
    next(error);
  }
}