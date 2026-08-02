"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in environment variables");
}
exports.default = {
    port: process.env.PORT || 5001,
    mongoUri: process.env.MONGO_URI,
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || "access",
        refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh",
        // Cast these to any or string to satisfy the jwt.sign overload
        accessExpiresIn: (process.env.ACCESS_TOKEN_EXPIRES_IN || "15m"),
        refreshExpiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"),
    },
    verification: {
        expiresIn: (process.env.VERIFY_EXPIRES_IN || "1d"),
    },
    reset: {
        expiresIn: (process.env.RESET_EXPIRES_IN || "1h"),
    },
};
