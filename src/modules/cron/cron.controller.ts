import { Request, Response, NextFunction } from "express";
import { cronService } from "./cron.service";
import { getCronJob } from "./cron.registry";

export const cronController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: cronService.getStatus() });
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const status = cronService.getStatus().find((j) => j.name === req.params.name);
      if (!status) return res.status(404).json({ success: false, message: "Cron job not found" });
      res.json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  },

  async run(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const record = await cronService.runNow(req.params.name, userId);
      res.json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  },

  async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const enabled = !!req.body.enabled;
      const job = cronService.setEnabled(req.params.name, enabled);
      res.json({
        success: true,
        data: { name: job.name, enabled: job.enabled },
      });
    } catch (err) {
      next(err);
    }
  },
};