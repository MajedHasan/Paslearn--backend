import multer from "multer";

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max (for video)
  },
});