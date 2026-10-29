import { Request, Response, NextFunction } from "express";
import EntitlementModel from "./entitlement.model";
import { entitlementService } from "./entitlement.service";
import { AppError } from "../../utils/appError";

export const entitlementController = {
  async myList(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const items = await EntitlementModel.find({ user: user.sub, status: "active" })
        .populate("product", "title slug thumbnailUrl priceModel type")
        .sort({ grantedAt: -1 })
        .lean();
      res.json({ success: true, data: items });
    } catch (err) { next(err); }
  },
  async adminGrant(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, productId, productType, refId, teacherId, expiresAt } = req.body;
      const ent = await entitlementService.grant({
        userId, productId, productType, refId, teacherId,
        source: "admin",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });
      res.status(201).json({ success: true, data: ent });
    } catch (err) { next(err); }
  },
  async adminRevoke(req: Request, res: Response, next: NextFunction) {
    try {
      const ent = await entitlementService.revoke(req.params.id, req.body?.reason);
      if (!ent) throw new AppError("Entitlement not found", 404);
      res.json({ success: true, data: ent });
    } catch (err) { next(err); }
  },
};