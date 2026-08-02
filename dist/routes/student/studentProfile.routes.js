"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// routes/profile.routes.ts
const express_1 = require("express");
const ProfileController = __importStar(require("../../controllers/student/studentProfile.controller"));
const auth_middleware_1 = require("../../middlewares/auth.middleware"); // you already have this
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.requireAuth);
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
router.post("/connected-accounts/disconnect", ProfileController.disconnectProvider);
// delete
router.delete("/", ProfileController.deleteAccount);
exports.default = router;
