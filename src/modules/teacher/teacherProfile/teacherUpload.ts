import multer from "multer";
import path from "path";
import fs from "fs";

// Determine a safe upload directory
function resolveUploadDir(): string {
  // Try the normal relative path first
  try {
    const dir = path.resolve(__dirname, "../../../../public/uploads/teachers");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch {
    // Vercel / serverless fallback – /tmp is always writable
    const dir = path.join("/tmp", "uploads", "teachers");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }
}

const UPLOAD_DIR = resolveUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Allow images and PDFs (for certificates, recommendation letters)
export const teacherUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error("Only images (jpg, png, gif, webp) and PDFs are allowed"));
  },
});