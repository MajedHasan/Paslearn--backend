// src/modules/admin/adminDashboard.controller.ts
import { Request, Response, NextFunction } from "express";
import * as service from "./adminDashboard.service";

export async function getDashboardHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const adminId = (req as any).user?.sub ?? (req as any).user?._id;
    const data = await service.getDashboard(String(adminId));
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function listUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.listUsers({
      search: (req.query.search as string) || undefined,
      role: (req.query.role as string) || undefined,
      status: (req.query.status as string) || undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function getUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getUserById(req.params.id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function updateUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.updateUser(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function deleteUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const adminId = (req as any).user?.sub ?? (req as any).user?._id;
    const data = await service.deleteUser(req.params.id, String(adminId));
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function getStatsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getStats();
    res.json({ success: true, data });
  } catch (e) { next(e); }
}