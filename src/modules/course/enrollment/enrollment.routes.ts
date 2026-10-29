import { Router } from "express";
import { enrollmentController } from "./enrollment.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";

const router = Router();
router.use(requireAuth);
router.get("/my", enrollmentController.myList);

export default router;