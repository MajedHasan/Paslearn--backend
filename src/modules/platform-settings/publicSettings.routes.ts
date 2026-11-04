// src/modules/platform-settings/publicSettings.routes.ts
import { Router } from "express";
import { platformSettingsService } from "./settings.service";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const data = await platformSettingsService.getPublicView();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;