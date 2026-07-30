import { Router } from "express";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

import {
    createPageTemplateController,
    getAllPageTemplatesController,
    getPageTemplateByIdController,
    updatePageTemplateController,
    deletePageTemplateController,
    getPageTemplateBySlugController
} from "./pageTemplate.controller";

const router = Router();

// Admin routes
router.post("/", requireAuth, requireRole("admin"), createPageTemplateController);
router.get("/", requireAuth, requireRole("admin"), getAllPageTemplatesController);
router.get("/:id", requireAuth, requireRole("admin"), getPageTemplateByIdController);
router.patch("/:id", requireAuth, requireRole("admin"), updatePageTemplateController);
router.delete("/:id", requireAuth, requireRole("admin"), deletePageTemplateController);

// Public routes
router.get("/", getAllPageTemplatesController);
router.get("/:id", getPageTemplateByIdController);
router.get("/slug/:slug", getPageTemplateBySlugController);

export default router;