import { Router } from "express";
import { certificateController } from "./certificate.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();

router.get("/verify/:slug", certificateController.verify);

router.use(requireAuth);
router.get("/my", certificateController.myList);
router.post("/courses/:courseId/request", certificateController.request);
router.post("/manual-issue", requireRole("teacher", "admin"), certificateController.manualIssue);
router.post("/:id/revoke", requireRole("teacher", "admin"), certificateController.revoke);

export default router;