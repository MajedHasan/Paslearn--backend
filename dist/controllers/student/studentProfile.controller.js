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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postProfile = void 0;
exports.getProfile = getProfile;
exports.postChangePassword = postChangePassword;
exports.prepare2FA = prepare2FA;
exports.enable2FA = enable2FA;
exports.disable2FA = disable2FA;
exports.listSessions = listSessions;
exports.revokeSession = revokeSession;
exports.revokeAllSessions = revokeAllSessions;
exports.listConnectedAccounts = listConnectedAccounts;
exports.disconnectProvider = disconnectProvider;
exports.deleteAccount = deleteAccount;
const multer_1 = __importDefault(require("multer"));
const ProfileService = __importStar(require("../../services/student/studentProfile.service"));
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
}); // 5MB
// GET /api/profile
async function getProfile(req, res, next) {
    try {
        const userId = req.user?.sub;
        const profile = await ProfileService.getStudentProfileByUserId(userId);
        res.json({ ok: true, profile });
    }
    catch (err) {
        next(err);
    }
}
// POST /api/profile  (multipart/form-data)
exports.postProfile = [
    upload.single("profilePicture"),
    async function (req, res, next) {
        try {
            const userId = req.user?.sub;
            const body = req.body;
            const file = req.file;
            let buffer;
            if (file)
                buffer = file.buffer;
            const profile = await ProfileService.upsertStudentProfile({
                userId,
                payload: {
                    fullName: body.fullName,
                    email: body.email,
                    username: body.username,
                    phoneNumber: body.phoneNumber,
                    bio: body.bio,
                },
                profilePictureBuffer: buffer,
                profilePictureFilename: file?.originalname,
            });
            res.json({ ok: true, profile });
        }
        catch (err) {
            next(err);
        }
    },
];
// POST /api/profile/change-password
async function postChangePassword(req, res, next) {
    try {
        const userId = req.user?.sub;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword)
            throw new Error("Missing fields");
        await ProfileService.changePassword(userId, currentPassword, newPassword);
        res.json({ ok: true, message: "Password changed" });
    }
    catch (err) {
        next(err);
    }
}
// 2FA prepare -> GET otpauth + base32
async function prepare2FA(req, res, next) {
    try {
        const userId = req.user?.sub;
        const data = await ProfileService.prepare2FA(userId);
        res.json({ ok: true, ...data });
    }
    catch (err) {
        next(err);
    }
}
// verify + enable 2FA
async function enable2FA(req, res, next) {
    try {
        const userId = req.user?.sub;
        const { token } = req.body;
        if (!token)
            throw new Error("Missing token");
        const recoveryCodes = await ProfileService.enable2FA(userId, token);
        res.json({ ok: true, recoveryCodes });
    }
    catch (err) {
        next(err);
    }
}
// disable 2FA
async function disable2FA(req, res, next) {
    try {
        const userId = req.user?.sub;
        const { tokenOrRecovery } = req.body;
        await ProfileService.disable2FA(userId, tokenOrRecovery);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
}
// sessions
async function listSessions(req, res, next) {
    try {
        const userId = req.user?.sub;
        const sessions = await ProfileService.listSessions(userId);
        res.json({ ok: true, sessions });
    }
    catch (err) {
        next(err);
    }
}
async function revokeSession(req, res, next) {
    try {
        const userId = req.user?.sub;
        const { jti } = req.body;
        if (!jti)
            throw new Error("Missing jti");
        await ProfileService.revokeSession(userId, jti);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
}
async function revokeAllSessions(req, res, next) {
    try {
        const userId = req.user?.sub;
        const { exceptJti } = req.body;
        await ProfileService.revokeAllSessions(userId, exceptJti);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
}
// connected accounts
async function listConnectedAccounts(req, res, next) {
    try {
        const userId = req.user?.sub;
        const list = await ProfileService.listConnectedAccounts(userId);
        res.json({ ok: true, connected: list });
    }
    catch (err) {
        next(err);
    }
}
async function disconnectProvider(req, res, next) {
    try {
        const userId = req.user?.sub;
        const { provider } = req.body;
        if (!provider)
            throw new Error("Missing provider");
        await ProfileService.disconnectProvider(userId, provider);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
}
// delete account
async function deleteAccount(req, res, next) {
    try {
        const userId = req.user?.sub;
        await ProfileService.deleteAccount(userId);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
}
