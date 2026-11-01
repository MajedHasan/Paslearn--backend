// ------------------ For Real VPS Server ------------------
// import mongoose from "mongoose";
// import app from "./app";
// import config from "./config";
// import logger from "./utils/logger";

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
import app from "./app";
import logger from "./utils/logger";
import { cronService } from "./modules/cron/cron.service";

// ⭐ Register all cron jobs before starting.
// Each job self-registers when its file is imported.
import "./modules/cron/jobs/courseRetentionCleanup.job";
import "./modules/cron/jobs/promoteCommissions.job";
import "./modules/cron/jobs/teacherPayouts.job";
// When you add more jobs later, just import them here:
// import "./modules/cron/jobs/aiBatchJob.job";
// import "./modules/cron/jobs/emailDigest.job";


const port = process.env.PORT || 5001;

const server = app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});


// start the scheduler
cronService.startAll();

process.on("SIGTERM", () => {
  logger.info("SIGTERM received");

  cronService.stopAll();

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});
