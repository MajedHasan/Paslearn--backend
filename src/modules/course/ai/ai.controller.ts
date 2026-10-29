import { Request, Response, NextFunction } from "express";
import { courseAiService } from "./ai.service";

export const courseAiController = {
  /** Enqueue only — returns queued job. */
  async enqueue(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const { type, refType, refId, courseId, input } = req.body;
      if (!type || !refType || !refId) {
        return res.status(400).json({ success: false, message: "type, refType, refId required" });
      }
      const job = await courseAiService.enqueue({
        type, refType, refId, courseId, input, requestedBy: userId,
      });
      res.status(201).json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  },

  /** Enqueue + process immediately — returns completed job (handy for testing). */
  async runNow(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const { type, refType, refId, courseId, input } = req.body;
      if (!type || !refType || !refId) {
        return res.status(400).json({ success: false, message: "type, refType, refId required" });
      }
      const job = await courseAiService.enqueue({
        type, refType, refId, courseId, input, requestedBy: userId,
      });
      const done = await courseAiService.process(String(job._id));
      res.json({ success: true, data: done });
    } catch (err) {
      next(err);
    }
  },

  async process(req: Request, res: Response, next: NextFunction) {
    try {
      const job = await courseAiService.process(req.params.id);
      res.json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const result = await courseAiService.listMine(userId, {
        type: req.query.type as string,
        status: req.query.status as string,
        courseId: req.query.courseId as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const isAdmin = (req as any).user.role === "admin";
      const job = await courseAiService.getJob(req.params.id, userId, isAdmin);
      res.json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const job = await courseAiService.cancel(req.params.id, userId);
      res.json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  },

  async retry(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.sub;
      const job = await courseAiService.retry(req.params.id, userId);
      res.json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  },

  async providerInfo(_req: Request, res: Response) {
    const { getAiProvider } = require("./ai.provider");
    const p = getAiProvider();
    res.json({
      success: true,
      data: {
        name: p.name,
        isStub: p.name === "stub",
        message:
          p.name === "stub"
            ? "Running with the stub provider — returns fake data. Register a real provider in server.ts using registerAiProvider()."
            : `Using ${p.name}.`,
      },
    });
  },

  // ── Admin ──
  async adminList(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await courseAiService.adminList({
        type: req.query.type as string,
        status: req.query.status as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async adminStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await courseAiService.stats();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};