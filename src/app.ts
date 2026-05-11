import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes";
import studentRoutes from "./routes/student/studentProfile.routes";
import classroomRoutes from "./routes/classroom.routes";
import { errorHandler } from "./middlewares/error.middleware";
import logger from "./utils/logger";

import experienceRoutes from "./modules/experience/experience.routes";
import { connectDB } from "./lib/db";

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

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/experiences", experienceRoutes);
app.get("/", (req, res) => res.json({ status: "ok", version: "1.0.0" }));

app.use(errorHandler);

export default app;
