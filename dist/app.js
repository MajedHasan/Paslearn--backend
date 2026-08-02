"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const error_middleware_1 = require("./middlewares/error.middleware");
const logger_1 = __importDefault(require("./utils/logger"));
const db_1 = require("./lib/db");
const index_routes_1 = __importDefault(require("./routes/index.routes"));
const app = (0, express_1.default)();
app.use("/uploads", express_1.default.static("uploads"));
app.set("trust proxy", 1);
app.use((0, helmet_1.default)());
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "http://localhost:3000", // your frontend dev URL
//     credentials: true, // allow cookies/authorization headers
//   }),
// );
app.use((0, cors_1.default)({
    origin: [
        process.env.FRONTEND_URL,
        "http://localhost:3000",
        "https://paslearn.com",
        "https://www.paslearn.com",
    ],
    credentials: true, // allow cookies/authorization headers
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)("combined", { stream: { write: (s) => logger_1.default.info(s.trim()) } }));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
});
app.use(limiter);
// ------------------ For Serverless Server (Like Vercel) ------------------
app.use("/api", async (req, res, next) => {
    try {
        await (0, db_1.connectDB)();
        next();
    }
    catch (err) {
        next(err);
    }
});
// --------------xx-- For Serverless Server (Like Vercel) --xx--------------
/*
 All routes
*/
app.use("/api", index_routes_1.default);
app.get("/", (req, res) => res.json({ status: "ok", version: "1.0.0" }));
app.use(error_middleware_1.errorHandler);
exports.default = app;
