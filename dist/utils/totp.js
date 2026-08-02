"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTOTPSecret = generateTOTPSecret;
exports.getQRCodeDataUrl = getQRCodeDataUrl;
exports.verifyTOTP = verifyTOTP;
// utils/totp.ts
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
function generateTOTPSecret({ name = "CourseHub", userEmail = "", }) {
    const secret = speakeasy_1.default.generateSecret({
        name: `${name}:${userEmail}`,
        length: 20,
    });
    return secret; // contains ascii, hex, base32, otpauth_url
}
// generate QR data URL for otpauth_url
async function getQRCodeDataUrl(otpauth_url) {
    return qrcode_1.default.toDataURL(otpauth_url);
}
function verifyTOTP(token, base32Secret) {
    return speakeasy_1.default.totp.verify({
        secret: base32Secret,
        encoding: "base32",
        token,
        window: 1,
    });
}
