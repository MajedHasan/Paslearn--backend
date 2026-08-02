"use strict";
// ------------------ For Real VPS Server ------------------
// import mongoose from "mongoose";
// import app from "./app";
// import config from "./config";
// import logger from "./utils/logger";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// const port = config.port || 5001;
// async function bootstrap() {
//   try {
//     await mongoose.connect(config.mongoUri);
//     logger.info("Connected to MongoDB");
//     const server = app.listen(port, () => {
//       logger.info(`Server listening on port ${port}`);
//     });
//     process.on("SIGINT", async () => {
//       logger.info("SIGINT received. Shutting down gracefully...");
//       await mongoose.disconnect();
//       server.close(() => {
//         logger.info("Server closed");
//         process.exit(0);
//       });
//     });
//   } catch (err) {
//     logger.error("Failed to start", err);
//     process.exit(1);
//   }
// }
// bootstrap();
// ------------------ For Serverless Server (Like Vercel) ------------------
const app_1 = __importDefault(require("./app"));
const logger_1 = __importDefault(require("./utils/logger"));
const port = process.env.PORT || 5001;
const server = app_1.default.listen(port, () => {
    logger_1.default.info(`Server running on port ${port}`);
});
process.on("SIGTERM", () => {
    logger_1.default.info("SIGTERM received");
    server.close(() => {
        logger_1.default.info("Server closed");
        process.exit(0);
    });
});
