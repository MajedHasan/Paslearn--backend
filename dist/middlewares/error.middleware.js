"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = __importDefault(require("../utils/logger"));
function errorHandler(err, req, res, next) {
    logger_1.default.error(err?.stack ?? err);
    const status = err.statusCode || 500;
    const message = status === 500
        ? "Internal server error"
        : err.message || "Something went wrong";
    if (err.name === "MongoServerSelectionError") {
        return res.status(503).json({
            message: "Database unavailable",
        });
    }
    return res.status(status).json({ message });
}
