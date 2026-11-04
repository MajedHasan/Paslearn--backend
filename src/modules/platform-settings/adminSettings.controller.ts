// src/modules/platform-settings/adminSettings.controller.ts
import { Request, Response, NextFunction } from "express";
import { platformSettingsService } from "./settings.service";
import { AppError } from "../../utils/appError";

export const adminSettingsController = {
  async get(_req: Request, res: Response, next: NextFunction) {
    try {
      const doc = await platformSettingsService.get();
      res.json({ success: true, data: doc.toObject() });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user?.sub;
      const payload = {
        general: req.body?.general,
        commerce: req.body?.commerce,
        subscriptions: req.body?.subscriptions,
        addons: req.body?.addons,
        ai: req.body?.ai,
        storage: req.body?.storage,
        security: req.body?.security,
        email: req.body?.email,
        features: req.body?.features,
        affiliate: req.body?.affiliate,
        legal: req.body?.legal,
      };
      const doc = await platformSettingsService.update(payload, adminId);
      res.json({ success: true, data: doc.toObject() });
    } catch (err: any) {
      if (err?.message && /must be/.test(err.message)) {
        return next(new AppError(err.message, 400));
      }
      next(err);
    }
  },

  async health(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformSettingsService.getIntegrationHealth();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ⭐ Test a single integration on demand
  async testConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const service = String(req.params.service || "").toLowerCase();
      const allowed = ["stripe", "paypal", "smtp", "r2", "mux", "bunny", "openai", "anthropic"];
      if (!allowed.includes(service)) {
        return next(new AppError("Unknown service", 400));
      }
      const data: any = await platformSettingsService.getIntegrationHealth();
      const key = service === "r2" ? "cloudflareR2" : service === "openai" || service === "anthropic" ? "ai" : service;
      const result = service === "openai" ? data.ai?.openai : service === "anthropic" ? data.ai?.anthropic : data[key];
      res.json({ success: true, data: { service, result } });
    } catch (err) { next(err); }
  },
};