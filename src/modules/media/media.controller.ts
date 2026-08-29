import { Request, Response, NextFunction } from "express";
import { mediaService } from "./media.service";
import { startTranscoding } from "../../queues/transcoder";

export class MediaController {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
      const userId = (req as any).user._id;
      const folder = (req.body.folder as string) || "";
      const parentFolderId = (req.body.parentFolderId as string) || null;
      const visibility = (req.body.visibility as any) || "public";
      const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

      const media = await mediaService.upload({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        userId,
        folder,
        parentFolderId,
        visibility,
        metadata,
      });

      res.status(201).json({ success: true, data: media });
    } catch (err) {
      next(err);
    }
  }

  async uploadMultiple(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ success: false, message: "No files uploaded" });

      const userId = (req as any).user._id;
      const folder = (req.body.folder as string) || "";
      const parentFolderId = (req.body.parentFolderId as string) || null;
      const visibility = (req.body.visibility as any) || "public";
      const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

      const uploadPromises = files.map((file) =>
        mediaService.upload({
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          userId,
          folder,
          parentFolderId,
          visibility,
          metadata,
        })
      );

      const media = await Promise.all(uploadPromises);
      res.status(201).json({ success: true, data: media });
    } catch (err) {
      next(err);
    }
  }

  async createFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { name, parentFolderId } = req.body;
      const folder = await mediaService.createFolder({ userId, name, parentFolderId });
      res.status(201).json({ success: true, data: folder });
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const parentFolderId = req.query.parentFolderId as string | null || null;
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;

      const result = await mediaService.list({ userId, parentFolderId, search, page, limit });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const media = await mediaService.getById(req.params.id);
      if (!media) return res.status(404).json({ success: false, message: "Media not found" });
      res.json({ success: true, data: media });
    } catch (err) {
      next(err);
    }
  }

  async getPresignedUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const expiresIn = parseInt(req.query.expiresIn as string) || 3600;
      const url = await mediaService.getPresignedUrl(req.params.id, expiresIn);
      res.json({ success: true, data: { url } });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await mediaService.delete(req.params.id);
      res.json({ success: true, message: "Media deleted" });
    } catch (err) {
      next(err);
    }
  }

  async transcode(req: Request, res: Response, next: NextFunction) {
    try {
      const media = await mediaService.getById(req.params.id);
      if (!media || media.isFolder) {
        return res.status(400).json({ success: false, message: "Invalid media" });
      }

      // Start background transcoding without Redis/BullMQ
      startTranscoding(media._id.toString());

      res.json({ success: true, message: "Transcoding started" });
    } catch (err) {
      next(err);
    }
  }
}

export const mediaController = new MediaController();