import { Router } from "express";
import FormController from "./form.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();

router.get("/public/:key", FormController.getPublicFormByKey);

router.post(
  "/admin",
  requireAuth,
  requireRole("admin"),
  FormController.createForm,
);

router.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  FormController.getAllForms,
);

router.get(
  "/admin/:id",
  requireAuth,
  requireRole("admin"),
  FormController.getFormById,
);

router.patch(
  "/admin/:id",
  requireAuth,
  requireRole("admin"),
  FormController.updateForm,
);

router.patch(
  "/admin/:id/toggle",
  requireAuth,
  requireRole("admin"),
  FormController.toggleForm,
);

router.delete(
  "/admin/:id",
  requireAuth,
  requireRole("admin"),
  FormController.deleteForm,
);

export default router;
