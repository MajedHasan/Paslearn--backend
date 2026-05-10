import { Router } from "express";
import * as authCtrl from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", authCtrl.register);
router.get("/verify-email", authCtrl.verifyEmail);
router.post("/verify-email", authCtrl.verifyEmail); // allow POST as well
router.post("/login", authCtrl.login);
router.post("/refresh", authCtrl.refresh); // body: { refreshToken }
router.post("/logout", requireAuth, authCtrl.logout);
router.post("/request-password-reset", authCtrl.requestPasswordReset);
router.post("/reset-password", authCtrl.resetPassword);

export default router;
