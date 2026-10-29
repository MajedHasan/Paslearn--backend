import { Request, Response, NextFunction } from "express";
import { cartService } from "./cart.service";

export const cartController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cartService.get((req as any).user.sub);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async add(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cartService.addItem((req as any).user.sub, {
        productId: req.body.productId,
        tierId: req.body.tierId,
      });
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cartService.removeItem((req as any).user.sub, req.params.itemId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async applyCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cartService.applyCoupon((req as any).user.sub, req.body.code);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async removeCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cartService.removeCoupon((req as any).user.sub);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};