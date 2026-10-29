// src/modules/coupon/coupon.routes.ts
import { Router } from "express";
import { couponController } from "./coupon.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

/**
 * Optional auth — attaches req.user if token present, otherwise continues.
 * Public cart preview needs to work for guests too.
 */
const optionalAuth = (req: any, res: any, next: any) => {
  const auth = req.headers.authorization;
  if (!auth) return next();
  return requireAuth(req, res, next);
};

// ── Public validate router (mounted at /api/coupons/validate) ──
export const couponValidationRouter = Router();
couponValidationRouter.post("/", optionalAuth, couponController.validate);

// ── Teacher/Admin management router (mounted at /api/coupons) ──
const router = Router();
router.use(requireAuth, requireRole("teacher", "admin"));

// Redemption tracking (teachers see their own)
router.get("/redemptions", couponController.teacherRedemptions);
router.get("/redemptions/stats", couponController.teacherRedemptionStats);
router.get("/:id/redemptions", (req, res, next) => {
  req.query.couponId = req.params.id;
  return couponController.teacherRedemptions(req, res, next);
});

// CRUD
router.get("/", couponController.list);
router.get("/:id", couponController.get);
router.post("/", couponController.create);
router.put("/:id", couponController.update);
router.delete("/:id", couponController.remove);

export default router;

// ── Admin (mounted at /api/admin/coupons) ──
export const adminCouponRoutes = Router();
adminCouponRoutes.use(requireAuth, requireRole("admin"));
adminCouponRoutes.get("/redemptions", couponController.adminRedemptions);
adminCouponRoutes.get("/redemptions/stats", couponController.adminRedemptionStats);
adminCouponRoutes.get("/:id/redemptions", (req, res, next) => {
  req.query.couponId = req.params.id;
  return couponController.adminRedemptions(req, res, next);
});