// src/routes/crud.routes.ts
import { Router } from "express";
import { createCrudController } from "./crud.controller";

export function createCrudRouter(
  controller: ReturnType<typeof createCrudController>
) {
  const router = Router();

  // List with filtering, sorting, pagination, search
  router.get("/", controller.list);

  // Export CSV (POST because filter may be complex)
  router.post("/export", controller.exportCSV);
  
  // Restore soft-deleted
  router.post("/:id/restore", controller.restore);

  // Get single document
  router.get("/:id", controller.get);

  // Create one
  router.post("/", controller.create);

  // Update one
  router.put("/:id", controller.update);

  // Delete one (soft or hard)
  router.delete("/:id", controller.delete);

  // Bulk operations
  router.post("/bulk", controller.bulkCreate);
  router.put("/bulk", controller.bulkUpdate);
  router.post("/bulk-delete", controller.bulkDelete);

  return router;
}