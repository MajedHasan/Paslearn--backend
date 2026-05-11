import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  logger.error(err?.stack ?? err);

  const status = err.statusCode || 500;
  const message =
    status === 500
      ? "Internal server error"
      : err.message || "Something went wrong";

  if (err.name === "MongoServerSelectionError") {
    return res.status(503).json({
      message: "Database unavailable",
    });
  }

  return res.status(status).json({ message });
}
