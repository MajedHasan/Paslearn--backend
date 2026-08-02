"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.verifyEmail = verifyEmail;
exports.loginUser = loginUser;
exports.rotateRefreshToken = rotateRefreshToken;
exports.logoutByRefreshToken = logoutByRefreshToken;
exports.requestPasswordReset = requestPasswordReset;
exports.resetPassword = resetPassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_model_1 = __importDefault(require("../models/user.model"));
const refreshToken_model_1 = require("../models/refreshToken.model");
const verificationToken_model_1 = require("../models/verificationToken.model");
const passwordResetToken_model_1 = require("../models/passwordResetToken.model");
const jwt_1 = require("../utils/jwt");
const config_1 = __importDefault(require("../config"));
const mongoose_1 = __importDefault(require("mongoose"));
const uuid_1 = require("uuid");
const email_1 = require("../utils/email");
const appError_1 = require("../utils/appError");
/**
 * Helper parse durations like "7d", "15m", "1h"
 */
function parseExpiryToMs(str) {
    const re = /^(\d+)([smhd])?$/i;
    const match = re.exec(str);
    if (!match)
        return 7 * 24 * 60 * 60 * 1000;
    const n = Number(match[1]);
    const unit = (match[2] || "d").toLowerCase();
    switch (unit) {
        case "s":
            return n * 1000;
        case "m":
            return n * 60 * 1000;
        case "h":
            return n * 60 * 60 * 1000;
        case "d":
            return n * 24 * 60 * 60 * 1000;
        default:
            return n * 24 * 60 * 60 * 1000;
    }
}
async function registerUser(payload) {
    console.log(payload);
    const existing = await user_model_1.default.findOne({ email: payload.email });
    if (existing)
        throw new Error("Email already taken");
    const hashed = await bcrypt_1.default.hash(payload.password, 10);
    const user = await user_model_1.default.create({
        email: payload.email,
        password: hashed,
        name: payload.name,
        role: payload.role || "student",
    });
    console.log(user, payload, hashed);
    // create verification token
    const vToken = (0, uuid_1.v4)();
    const expiresMs = parseExpiryToMs("1d"); // verify link valid 1 day
    const expiresAt = new Date(Date.now() + expiresMs);
    await verificationToken_model_1.VerificationTokenModel.create({
        token: vToken,
        user: user._id,
        expiresAt,
    });
    // send "email" (in dev will log) and return link so dev can click
    const emailResult = await (0, email_1.sendVerificationEmail)(user.email, vToken);
    return {
        id: user._id,
        email: user.email,
        name: user.name,
        emailVerificationLink: emailResult.link,
    };
}
async function verifyEmail(token) {
    const doc = await verificationToken_model_1.VerificationTokenModel.findOne({ token, used: false });
    if (!doc)
        throw new Error("Invalid or expired verification token");
    if (doc.expiresAt.getTime() < Date.now())
        throw new Error("Verification token expired");
    // mark used
    doc.used = true;
    await doc.save();
    // mark user verified
    await user_model_1.default.findByIdAndUpdate(doc.user, { emailVerified: true });
    return true;
}
// export async function loginUser(payload: { email: string; password: string }) {
//   const user = await UserModel.findOne({ email: payload.email });
//   if (!user) throw new Error("Invalid credentials");
//   const ok = await bcrypt.compare(payload.password, user.password);
//   if (!ok) throw new Error("Invalid credentials");
//   // Issue access token
//   const accessToken = signAccessToken({
//     sub: user._id.toString(),
//     email: user.email,
//     role: user.role,
//   });
//   // Issue refresh token (with jti) and persist
//   const jti = uuidv4();
//   const refreshToken = signRefreshToken({ sub: user._id.toString(), jti });
//   const expiresInMs = parseExpiryToMs(config.jwt.refreshExpiresIn);
//   const expiresAt = new Date(Date.now() + expiresInMs);
//   await RefreshTokenModel.create({
//     jti,
//     token: refreshToken,
//     user: user._id,
//     expiresAt,
//     revoked: false,
//     replacedBy: null,
//   });
//   return {
//     accessToken,
//     refreshToken,
//     user: { id: user._id, email: user.email, role: user.role },
//   };
// }
async function loginUser(payload) {
    try {
        const user = await user_model_1.default.findOne({ email: payload.email });
        if (!user)
            throw new appError_1.AppError("Invalid email or password", 401);
        console.log(user, payload);
        const ok = await bcrypt_1.default.compare(payload.password, user.password);
        if (!ok)
            throw new appError_1.AppError("Invalid email or password", 401);
        // issue access token & refresh token...
        const accessToken = (0, jwt_1.signAccessToken)({
            sub: user._id.toString(),
            email: user.email,
            role: user.role,
        });
        const jti = (0, uuid_1.v4)();
        const refreshToken = (0, jwt_1.signRefreshToken)({ sub: user._id.toString(), jti });
        const expiresInMs = parseExpiryToMs(config_1.default.jwt.refreshExpiresIn);
        const expiresAt = new Date(Date.now() + expiresInMs);
        await refreshToken_model_1.RefreshTokenModel.create({
            jti,
            token: refreshToken,
            user: user._id,
            expiresAt,
            revoked: false,
            replacedBy: null,
        });
        return {
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                name: user.name,
                profileImageUrl: user.profileImageUrl,
            },
        };
    }
    catch (err) {
        // convert unknown errors to AppError
        if (!(err instanceof appError_1.AppError))
            throw new appError_1.AppError("Internal server error", 500);
        throw err;
    }
}
/**
 * Refresh token rotation:
 * - Verify signature and payload (get jti)
 * - Find stored token by jti and ensure not revoked and token string matches (prevent token substitution)
 * - Revoke the old token and set replacedBy = new jti
 * - Create & store new refresh token with new jti
 * - Return new access token + new refresh token
 */
async function rotateRefreshToken(oldRefreshToken) {
    let payload;
    try {
        payload = (0, jwt_1.verifyRefreshToken)(oldRefreshToken);
    }
    catch (err) {
        throw new Error("Invalid refresh token");
    }
    const { sub, jti: oldJti } = payload;
    // find the stored token
    const stored = await refreshToken_model_1.RefreshTokenModel.findOne({ jti: oldJti });
    if (!stored)
        throw new Error("Refresh token not found (possibly revoked)");
    if (stored.revoked) {
        // Token was revoked — investigation: revoke all tokens for user to mitigate reuse
        await refreshToken_model_1.RefreshTokenModel.updateMany({ user: stored.user }, { revoked: true });
        throw new Error("Refresh token revoked");
    }
    if (stored.token !== oldRefreshToken) {
        // token mismatch (possible theft) — revoke all user tokens
        await refreshToken_model_1.RefreshTokenModel.updateMany({ user: stored.user }, { revoked: true });
        throw new Error("Refresh token mismatch - suspicious");
    }
    if (stored.expiresAt.getTime() < Date.now()) {
        throw new Error("Refresh token expired");
    }
    // create new refresh token
    const newJti = (0, uuid_1.v4)();
    const newRefreshToken = (0, jwt_1.signRefreshToken)({ sub, jti: newJti });
    const expiresInMs = parseExpiryToMs(config_1.default.jwt.refreshExpiresIn);
    const expiresAt = new Date(Date.now() + expiresInMs);
    // save new token and mark old as replaced
    await refreshToken_model_1.RefreshTokenModel.create({
        jti: newJti,
        token: newRefreshToken,
        user: stored.user,
        expiresAt,
        revoked: false,
        replacedBy: null,
    });
    stored.revoked = true;
    stored.replacedBy = newJti;
    await stored.save();
    // new access token
    const user = await user_model_1.default.findById(sub);
    if (!user)
        throw new Error("User not found");
    const accessToken = (0, jwt_1.signAccessToken)({
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
    });
    return { accessToken, refreshToken: newRefreshToken };
}
async function logoutByRefreshToken(refreshToken, userId) {
    if (refreshToken) {
        // revoke only that token
        const payload = (() => {
            try {
                return (0, jwt_1.verifyRefreshToken)(refreshToken);
            }
            catch {
                return null;
            }
        })();
        if (payload?.jti) {
            await refreshToken_model_1.RefreshTokenModel.findOneAndUpdate({ jti: payload.jti }, { revoked: true });
        }
    }
    else if (userId) {
        await refreshToken_model_1.RefreshTokenModel.updateMany({ user: new mongoose_1.default.Types.ObjectId(userId) }, { revoked: true });
    }
}
/* Password reset flows */
async function requestPasswordReset(email) {
    const user = await user_model_1.default.findOne({ email });
    if (!user)
        throw new Error("User not found");
    const token = (0, uuid_1.v4)();
    const expiresMs = parseExpiryToMs("1h"); // reset token valid 1 hour
    const expiresAt = new Date(Date.now() + expiresMs);
    await passwordResetToken_model_1.PasswordResetTokenModel.create({ token, user: user._id, expiresAt });
    // send dev email
    const emailResult = await (0, email_1.sendPasswordResetEmail)(user.email, token);
    return { resetLink: emailResult.link };
}
async function resetPassword(token, newPassword) {
    const doc = await passwordResetToken_model_1.PasswordResetTokenModel.findOne({ token, used: false });
    if (!doc)
        throw new Error("Invalid or expired reset token");
    if (doc.expiresAt.getTime() < Date.now())
        throw new Error("Reset token expired");
    // set new password
    const hashed = await bcrypt_1.default.hash(newPassword, 10);
    await user_model_1.default.findByIdAndUpdate(doc.user, { password: hashed });
    doc.used = true;
    await doc.save();
    // revoke all refresh tokens for the user (security)
    await refreshToken_model_1.RefreshTokenModel.updateMany({ user: doc.user }, { revoked: true });
    return true;
}
