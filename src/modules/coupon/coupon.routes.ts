// src/modules/coupon/coupon.routes.ts
import { Router } from "express";
import { couponController } from "./coupon.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

// ── Public validate (mounted at /api/coupons/validate) ──
const optionalAuth = (req: any, res: any, next: any) => {
  const auth = req.headers.authorization;
  if (!auth) return next();
  return requireAuth(req, res, next);
};

export const couponValidationRouter = Router();
couponValidationRouter.post("/", optionalAuth, couponController.validate);

// ── Teacher/Admin management (mounted at /api/coupons) ──
const router = Router();
router.use(requireAuth, requireRole("teacher", "admin"));

// CRUD
router.get("/", couponController.list);
router.post("/", couponController.create);

// ⭐ Redemptions MUST be before /:id
router.get("/redemptions", couponController.teacherRedemptions);
router.get("/redemptions/stats", couponController.teacherRedemptionStats);
router.get("/:id/redemptions", (req, res, next) => {
  req.query.couponId = req.params.id;
  return couponController.teacherRedemptions(req, res, next);
});

// Get/update/delete (must be LAST)
router.get("/:id", couponController.get);
router.put("/:id", couponController.update);
router.delete("/:id", couponController.remove);

export default router;

// ── Admin (mounted at /api/admin/coupons) ──
// Same controller methods — ownership and item-type split enforced by service.
export const adminCouponRoutes = Router();
adminCouponRoutes.use(requireAuth, requireRole("admin"));

// CRUD (list returns only ownerType="admin"; create forces ownerType="admin")
adminCouponRoutes.get("/", couponController.list);
adminCouponRoutes.post("/", couponController.create);

// Admin redemptions (all redemptions across the platform)
adminCouponRoutes.get("/redemptions", couponController.adminRedemptions);
adminCouponRoutes.get("/redemptions/stats", couponController.adminRedemptionStats);
adminCouponRoutes.get("/:id/redemptions", (req, res, next) => {
  req.query.couponId = req.params.id;
  return couponController.adminRedemptions(req, res, next);
});

// Get/update/delete (must be LAST)
adminCouponRoutes.get("/:id", couponController.get);
adminCouponRoutes.put("/:id", couponController.update);
adminCouponRoutes.delete("/:id", couponController.remove);