import { Router } from "express";
import { teacherEarningsController } from "./earnings.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();
router.use(requireAuth, requireRole("teacher", "admin"));

router.get("/transactions", teacherEarningsController.transactions);
router.get("/per-product", teacherEarningsController.perProduct);
router.get("/products", teacherEarningsController.listProducts);
router.patch(
  "/products/:productId/commission",
  teacherEarningsController.updateCommission
);

export default router;