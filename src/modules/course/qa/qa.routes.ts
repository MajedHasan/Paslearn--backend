import { Router } from "express";
import { qaController } from "./qa.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";

const router = Router();

router.get("/courses/:courseId/qa", qaController.list);  // public read
router.use(requireAuth);
router.post("/courses/:courseId/qa", qaController.ask);
router.post("/qa/:id/answers", qaController.answer);
router.post("/qa/:id/resolve", qaController.resolve);
router.post("/qa/:id/pin", qaController.pin);
router.post("/qa/:id/answers/:answerId/helpful", qaController.helpful);

export default router;