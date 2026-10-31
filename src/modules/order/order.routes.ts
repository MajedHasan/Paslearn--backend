import { Router } from "express";
import { orderController } from "./order.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();
router.use(requireAuth);

router.get("/preview", orderController.preview);
router.post("/", orderController.create);
router.post("/:id/pay", orderController.pay);
router.post("/:id/cancel", orderController.cancel);
router.post("/:id/verify", orderController.verify);
router.get("/:id", orderController.get);
router.get("/", orderController.list);

export default router;

// Admin refund route (mounted separately at /admin/orders)
export const adminOrderRoutes = Router();
adminOrderRoutes.use(requireAuth, requireRole("admin"));
adminOrderRoutes.post("/:id/refund", orderController.adminRefund);