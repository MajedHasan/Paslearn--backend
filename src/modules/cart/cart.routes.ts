import { Router } from "express";
import { cartController } from "./cart.controller";
import { requireAuth } from "../../middlewares/auth.middleware";

const router = Router();
router.use(requireAuth);

router.get("/", cartController.get);
router.post("/items", cartController.add);
router.delete("/items/:itemId", cartController.remove);
router.post("/apply-coupon", cartController.applyCoupon);
router.delete("/coupon", cartController.removeCoupon);

export default router;