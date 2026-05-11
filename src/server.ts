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

const port = process.env.PORT || 5001;

const server = app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received");

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});
