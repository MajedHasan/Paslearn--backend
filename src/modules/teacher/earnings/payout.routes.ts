import { Router } from "express";
import { teacherPayoutService } from "./payout.service";
import { requireAuth } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();
router.use(requireAuth, requireRole("teacher", "admin"));

router.get("/balance", async (req, res, next) => {
  try {
    const data = await teacherPayoutService.balance((req as any).user.sub);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get("/", async (req, res, next) => {
  try {
    const data = await teacherPayoutService.listMine((req as any).user.sub, {
      status: req.query.status as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
});

router.post("/request", async (req, res, next) => {
  try {
    const data = await teacherPayoutService.requestPayout((req as any).user.sub, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;

// ⭐ Admin router
export const adminTeacherPayoutRoutes = Router();
adminTeacherPayoutRoutes.use(requireAuth, requireRole("admin"));

adminTeacherPayoutRoutes.get("/", async (req, res, next) => {
  try {
    const data = await teacherPayoutService.adminList({
      status: req.query.status as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
});

adminTeacherPayoutRoutes.post("/:id/process", async (req, res, next) => {
  try {
    const { action, reason, externalRef } = req.body;
    if (!["approve", "reject", "paid"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }
    const data = await teacherPayoutService.adminProcess(req.params.id, action, reason, externalRef);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

adminTeacherPayoutRoutes.post("/auto-create", async (req, res, next) => {
  try {
    const data = await teacherPayoutService.autoCreatePayouts();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});