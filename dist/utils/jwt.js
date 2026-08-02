"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, config_1.default.jwt.accessSecret, {
        expiresIn: config_1.default.jwt.accessExpiresIn,
    });
}
function signRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, config_1.default.jwt.refreshSecret, {
        expiresIn: config_1.default.jwt.refreshExpiresIn,
    });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, config_1.default.jwt.accessSecret);
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, config_1.default.jwt.refreshSecret);
}
