import { Router } from "express";
import { progressController } from "./progress.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";

const router = Router();
router.use(requireAuth);
router.get("/course/:courseId", progressController.forCourse);

export default router;