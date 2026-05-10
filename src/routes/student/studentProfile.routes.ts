// routes/profile.routes.ts
import { Router } from "express";
import * as ProfileController from "../../controllers/student/studentProfile.controller";
import { requireAuth } from "../../middlewares/auth.middleware"; // you already have this

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get("/", ProfileController.getProfile);
router.post("/", ProfileController.postProfile); // multipart/form-data

router.post("/change-password", ProfileController.postChangePassword);

// 2FA
router.get("/2fa/prepare", ProfileController.prepare2FA);
router.post("/2fa/enable", ProfileController.enable2FA);
router.post("/2fa/disable", ProfileController.disable2FA);

// sessions
router.get("/sessions", ProfileController.listSessions);
router.post("/sessions/revoke", ProfileController.revokeSession);
router.post("/sessions/revoke-all", ProfileController.revokeAllSessions);

// connected accounts
router.get("/connected-accounts", ProfileController.listConnectedAccounts);
router.post(
  "/connected-accounts/disconnect",
  ProfileController.disconnectProvider
);

// delete
router.delete("/", ProfileController.deleteAccount);

export default router;
