import { Router } from "express";
import { cronController } from "./cron.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/", cronController.list);
router.get("/:name", cronController.get);
router.post("/:name/run", cronController.run);
router.post("/:name/toggle", cronController.toggle);

export default router;