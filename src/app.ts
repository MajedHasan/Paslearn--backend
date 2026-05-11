import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middlewares/error.middleware";
import logger from "./utils/logger";

import { connectDB } from "./lib/db";

import routes from "./routes/index.routes";

const app = express();

app.use("/uploads", express.static("uploads"));
app.set("trust proxy", 1);
app.use(helmet());
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "http://localhost:3000", // your frontend dev URL
//     credentials: true, // allow cookies/authorization headers
//   }),
// );
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL as string,
      "http://localhost:3000",
      "https://paslearn.com",
      "https://www.paslearn.com",
    ],
    credentials: true, // allow cookies/authorization headers
  }),
);
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  morgan("combined", { stream: { write: (s) => logger.info(s.trim()) } }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use(limiter);

// ------------------ For Serverless Server (Like Vercel) ------------------
app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});
// --------------xx-- For Serverless Server (Like Vercel) --xx--------------

/*
 All routes
*/
app.use("/api", routes);

app.get("/", (req, res) => res.json({ status: "ok", version: "1.0.0" }));

app.use(errorHandler);

export default app;
