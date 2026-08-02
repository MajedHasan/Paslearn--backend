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
exports.register = register;
exports.verifyEmail = verifyEmail;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.requestPasswordReset = requestPasswordReset;
exports.resetPassword = resetPassword;
const authService = __importStar(require("../services/auth.service"));
async function register(req, res, next) {
    try {
        const { email, password, name, role } = req.body;
        const result = await authService.registerUser({
            email,
            password,
            name,
            role,
        });
        // result contains emailVerificationLink for dev
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
}
async function verifyEmail(req, res, next) {
    try {
        const token = (req.query.token || req.body.token);
        if (!token)
            throw new Error("Missing token");
        await authService.verifyEmail(token);
        res.json({ ok: true, message: "Email verified" });
    }
    catch (err) {
        next(err);
    }
}
async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        const result = await authService.loginUser({ email, password });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
}
async function refresh(req, res, next) {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken)
            throw new Error("Missing refreshToken");
        const result = await authService.rotateRefreshToken(refreshToken);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
}
async function logout(req, res, next) {
    try {
        const { refreshToken } = req.body;
        const userId = req.user?.sub;
        await authService.logoutByRefreshToken(refreshToken, userId);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
}
async function requestPasswordReset(req, res, next) {
    try {
        const { email } = req.body;
        if (!email)
            throw new Error("Missing email");
        const result = await authService.requestPasswordReset(email);
        res.json(result); // dev: contains resetLink
    }
    catch (err) {
        next(err);
    }
}
async function resetPassword(req, res, next) {
    try {
        const { token, password } = req.body;
        if (!token || !password)
            throw new Error("Missing token or password");
        await authService.resetPassword(token, password);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
}
