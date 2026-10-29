import { Router } from "express";
import { productController } from "./product.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();
router.use(requireAuth);
router.get("/", productController.list);
router.get("/:id", productController.get);

export const adminProductRoutes = Router();
adminProductRoutes.use(requireAuth, requireRole("admin"));
adminProductRoutes.put("/:id/commission", productController.updateCommission);

export default router;