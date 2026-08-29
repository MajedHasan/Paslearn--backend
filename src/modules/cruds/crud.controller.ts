// src/controllers/crud.controller.ts
import { Request, Response, NextFunction } from "express";
import { createCrudService } from "./crud.service";
import { parseListQuery } from "./utils.query";

export function createCrudController(
  service: ReturnType<typeof createCrudService>,
  options: {
    defaultPopulate?: any;
    // Optional validation function. Return { error: string } if invalid.
    validate?: (data: any) => { error?: string } | void;
  } = {}
) {
  return {
    // GET /api/... list with filtering, sorting, pagination, search
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const pq = parseListQuery(req, { page: 1, limit: 15 });
        const result = await service.list({
          filter: pq.filter,
          page: pq.page,
          limit: pq.limit,
          sort: pq.sort,
          select: pq.select,
          populate: pq.populate ?? options.defaultPopulate,
          q: pq.q,
          searchFields: pq.searchFields,
        });
        res.json({ success: true, ...result });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/.../export CSV (POST recommended, see routes)
    exportCSV: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const fields = (req.query.fields as string)?.split(",") || [];
        const csv = await service.exportCSV({
          filter: req.body.filter || {},
          fields,
          populate: req.query.populate,
        });
        res.setHeader("Content-Type", "text/csv");
        res.send(csv);
      } catch (err) {
        next(err);
      }
    },

    // GET /api/.../:id
    get: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const doc = await service.getById(req.params.id, {
          populate: (req.query.populate as any) || options.defaultPopulate,
        });
        if (!doc) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, data: doc });
      } catch (err) {
        next(err);
      }
    },

    // POST /api/...
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (options.validate) {
          const validation = options.validate(req.body);
          if (validation?.error) {
            return res.status(400).json({ success: false, message: validation.error });
          }
        }
        const created = await service.create(req.body, { userId: (req as any).user?._id });
        res.status(201).json({ success: true, data: created });
      } catch (err) {
        next(err);
      }
    },

    // PUT /api/.../:id
    update: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (options.validate) {
          const validation = options.validate(req.body);
          if (validation?.error) {
            return res.status(400).json({ success: false, message: validation.error });
          }
        }
        const updated = await service.update(req.params.id, req.body, { userId: (req as any).user?._id });
        if (!updated) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, data: updated });
      } catch (err) {
        next(err);
      }
    },

    // DELETE /api/.../:id?hard=true
    delete: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const hard = req.query.hard === "true";
        const deleted = await service.remove(req.params.id, { hard, userId: (req as any).user?._id });
        if (!deleted) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, data: deleted });
      } catch (err) {
        next(err);
      }
    },

    // POST /api/.../:id/restore
    restore: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const restored = await service.restore(req.params.id, { userId: (req as any).user?._id });
        if (!restored) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, data: restored });
      } catch (err) {
        next(err);
      }
    },

    // POST /api/.../bulk
    bulkCreate: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const created = await service.bulkCreate(req.body, { userId: (req as any).user?._id });
        res.status(201).json({ success: true, data: created });
      } catch (err) {
        next(err);
      }
    },

    // PUT /api/.../bulk
    bulkUpdate: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const results = await service.bulkUpdate(req.body, { userId: (req as any).user?._id });
        res.json({ success: true, data: results });
      } catch (err) {
        next(err);
      }
    },

    // POST /api/.../bulk-delete
    bulkDelete: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const filters = req.body.filters || [];
        const hard = req.query.hard === "true";
        const result = await service.bulkDelete(filters, { hard, userId: (req as any).user?._id });
        res.json({ success: true, data: result });
      } catch (err) {
        next(err);
      }
    },
  };
}