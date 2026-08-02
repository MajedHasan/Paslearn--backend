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
exports.getStudentProfileByUserId = getStudentProfileByUserId;
exports.upsertStudentProfile = upsertStudentProfile;
exports.changePassword = changePassword;
exports.prepare2FA = prepare2FA;
exports.enable2FA = enable2FA;
exports.disable2FA = disable2FA;
exports.listSessions = listSessions;
exports.revokeSession = revokeSession;
exports.revokeAllSessions = revokeAllSessions;
exports.listConnectedAccounts = listConnectedAccounts;
exports.disconnectProvider = disconnectProvider;
exports.deleteAccount = deleteAccount;
// services/profile.service.ts
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const studentProfile_model_1 = __importDefault(require("../../models/student/studentProfile.model"));
const user_model_1 = __importDefault(require("../../models/user.model"));
const session_model_1 = __importDefault(require("../../models/session.model"));
const connectedAccount_model_1 = __importDefault(require("../../models/connectedAccount.model"));
const storage_1 = require("../../utils/storage");
const totp_1 = require("../../utils/totp");
async function getStudentProfileByUserId(userId) {
    const profile = await studentProfile_model_1.default.findOne({
        user: userId,
        deletedAt: null,
    }).lean();
    return profile;
}
/**
 * Update profile (supports form-data with optional profilePicture buffer)
 * - updates both User (email) and StudentProfile (fullName, username, phoneNumber, bio, profileImageUrl)
 * - uses transaction to keep consistency
 */
async function upsertStudentProfile({ userId, payload, profilePictureBuffer, profilePictureFilename, }) {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // if email changed - ensure uniqueness and mark emailVerified = false (you may want to trigger a verify flow)
        if (payload.email) {
            const existing = await user_model_1.default.findOne({
                email: payload.email.toLowerCase(),
                _id: { $ne: userId },
            }).session(session);
            if (existing)
                throw new Error("Email already in use");
            await user_model_1.default.findByIdAndUpdate(userId, { email: payload.email.toLowerCase(), emailVerified: false }, { session });
        }
        // upload profile picture if provided
        let uploadedUrl;
        if (profilePictureBuffer && profilePictureFilename) {
            // in prod call S3 upload; here using local
            const uploaded = await storage_1.StorageDriver.uploadLocal(profilePictureBuffer, profilePictureFilename, "uploads");
            uploadedUrl = uploaded.url;
        }
        // upsert student profile
        const update = {
            fullName: payload.fullName,
            username: payload.username,
            phoneNumber: payload.phoneNumber,
            bio: payload.bio,
        };
        if (uploadedUrl)
            update.profileImageUrl = uploadedUrl;
        const profile = await studentProfile_model_1.default.findOneAndUpdate({ user: userId }, { $set: update }, { new: true, upsert: true, setDefaultsOnInsert: true, session });
        await session.commitTransaction();
        session.endSession();
        return profile;
    }
    catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
}
/**
 * Change password - verify current password and replace with new hashed password.
 */
async function changePassword(userId, currentPlain, newPlain) {
    const user = await user_model_1.default.findById(userId);
    if (!user)
        throw new Error("User not found");
    const ok = await bcrypt_1.default.compare(currentPlain, user.password);
    if (!ok)
        throw new Error("Current password is incorrect");
    const hashed = await bcrypt_1.default.hash(newPlain, 12);
    user.password = hashed;
    await user.save();
    // optionally revoke sessions / refresh tokens - create logic to revoke session tokens for user
    await session_model_1.default.updateMany({ user: user._id }, { revokedAt: new Date() });
    return true;
}
/**
 * 2FA setup (returns secret and qr dataUrl). We do NOT enable 2FA until verified.
 * Save secret in profile.twoFactor.secret temporarily (encrypt in prod).
 */
async function prepare2FA(userId) {
    const user = await user_model_1.default.findById(userId);
    if (!user)
        throw new Error("User not found");
    const secret = (0, totp_1.generateTOTPSecret)({
        name: "CourseHub",
        userEmail: user.email,
    });
    // save secret in profile (temporary)
    const profile = await studentProfile_model_1.default.findOneAndUpdate({ user: userId }, { $set: { "twoFactor.secret": secret.base32 } }, { new: true, upsert: true }).lean();
    // return otpauth_url / base32
    return { otpauth_url: secret.otpauth_url, base32: secret.base32 };
}
/**
 * Verify TOTPs and enable 2FA, generate recovery codes
 */
async function enable2FA(userId, token) {
    const profile = await studentProfile_model_1.default.findOne({ user: userId });
    if (!profile || !profile.twoFactor?.secret)
        throw new Error("TOTP not initialized");
    // verify token (use utils/totp.verifyTOTP)
    const { verifyTOTP } = await Promise.resolve().then(() => __importStar(require("../../utils/totp")));
    const ok = verifyTOTP(token, profile.twoFactor.secret);
    if (!ok)
        throw new Error("Invalid TOTP code");
    // generate recovery codes (store hashed in prod)
    const codes = Array.from({ length: 5 }).map(() => crypto_1.default.randomBytes(4).toString("hex").toUpperCase());
    profile.twoFactor.enabled = true;
    profile.twoFactor.recoveryCodes = codes;
    await profile.save();
    // return plain recovery codes to user ONCE
    return codes;
}
/**
 * Disable 2FA (requires either a valid TOTP or a recovery code)
 */
async function disable2FA(userId, tokenOrRecovery) {
    const profile = await studentProfile_model_1.default.findOne({ user: userId });
    if (!profile || !profile.twoFactor?.enabled)
        throw new Error("2FA not enabled");
    const { verifyTOTP } = await Promise.resolve().then(() => __importStar(require("../../utils/totp")));
    let ok = false;
    if (tokenOrRecovery) {
        ok = verifyTOTP(tokenOrRecovery, profile.twoFactor.secret || "");
        if (!ok) {
            // check recovery codes
            const idx = (profile.twoFactor.recoveryCodes || []).indexOf(tokenOrRecovery);
            if (idx !== -1) {
                // consume code
                profile.twoFactor.recoveryCodes.splice(idx, 1);
                ok = true;
            }
        }
    }
    if (!ok)
        throw new Error("Invalid TOTP or recovery code");
    profile.twoFactor = { enabled: false };
    await profile.save();
    return true;
}
/**
 * Sessions: list user's sessions
 */
async function listSessions(userId) {
    const sessions = await session_model_1.default.find({ user: userId })
        .sort({ lastActiveAt: -1 })
        .lean();
    return sessions;
}
/**
 * Revoke session by jti
 */
async function revokeSession(userId, jti) {
    const s = await session_model_1.default.findOne({ user: userId, jti });
    if (!s)
        throw new Error("Session not found");
    s.revokedAt = new Date();
    await s.save();
    // also revoke refresh token in refreshToken collection if you have one.
    return true;
}
/**
 * Revoke all sessions except current (optionally)
 */
async function revokeAllSessions(userId, exceptJti) {
    const q = { user: userId, revokedAt: null };
    if (exceptJti)
        q.jti = { $ne: exceptJti };
    await session_model_1.default.updateMany(q, { revokedAt: new Date() });
    return true;
}
/**
 * Connected accounts
 */
async function listConnectedAccounts(userId) {
    return connectedAccount_model_1.default.find({ user: userId }).lean();
}
async function disconnectProvider(userId, provider) {
    await connectedAccount_model_1.default.deleteOne({ user: userId, provider });
    return true;
}
/**
 * Soft-delete account: flag both User.deletedAt (or status) and StudentProfile.deletedAt
 * The actual deletion strategy depends on GDPR and retention rules.
 */
async function deleteAccount(userId) {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        await studentProfile_model_1.default.updateOne({ user: userId }, { $set: { deletedAt: new Date() } }, { session });
        await user_model_1.default.findByIdAndUpdate(userId, { $set: { deletedAt: new Date(), status: "deleted" } }, { session });
        // revoke sessions
        await session_model_1.default.updateMany({ user: userId }, { revokedAt: new Date() }, { session });
        await session.commitTransaction();
        session.endSession();
        return true;
    }
    catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
}
