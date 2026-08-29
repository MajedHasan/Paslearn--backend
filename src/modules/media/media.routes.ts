import { Router } from "express";
import { mediaController } from "./media.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { uploadMiddleware } from "../../middlewares/upload.middleware";

const router = Router();

router.use(requireAuth);

router.post("/upload", uploadMiddleware.single("file"), mediaController.upload);
router.post("/upload/multiple", uploadMiddleware.array("files", 10), mediaController.uploadMultiple);
router.post("/folders", mediaController.createFolder);
router.get("/", mediaController.list);
router.get("/:id", mediaController.get);
router.get("/:id/presigned-url", mediaController.getPresignedUrl);
router.delete("/:id", mediaController.delete);
router.post("/:id/transcode", mediaController.transcode);

export default router;