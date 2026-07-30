import { Request, Response, NextFunction } from "express";
import SubmissionService from "./submission.service";

class SubmissionController {
  async createPublicSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;

      // 1. Extract values from req.body (all non‑file fields)
      const values: Record<string, any> = { ...req.body };
      // Remove meta string if present (it's handled separately)
      delete values.meta;

      // 2. Parse meta
      let meta: Record<string, any> = {};
      if (req.body.meta) {
        try {
          meta = JSON.parse(req.body.meta);
        } catch {}
      }

      // 3. Build file info array
      const files: { fieldKey: string; originalName: string; url: string; mimeType: string }[] = [];
      const uploadedFiles = (req as any).files;
      if (uploadedFiles && typeof uploadedFiles === "object") {
        for (const [fieldKey, fileArray] of Object.entries(uploadedFiles)) {
          const file = (fileArray as any)[0];
          if (file) {
            files.push({
              fieldKey,
              originalName: file.originalname,
              url: `/uploads/submissions/${file.filename}`,
              mimeType: file.mimetype,
            });
          }
        }
      }

      const submission = await SubmissionService.createPublicSubmission(key, {
        values,
        files,
        meta,
      });

      return res.status(201).json({
        success: true,
        message: "Submitted successfully",
        data: submission,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const subs = await SubmissionService.getAll(req.query as Record<string, any>);
      return res.status(200).json({ success: true, data: subs });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const sub = await SubmissionService.getById(req.params.id);
      if (!sub) return res.status(404).json({ success: false, message: "Submission not found" });
      return res.status(200).json({ success: true, data: sub });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const sub = await SubmissionService.updateStatus(id, status, notes);
      if (!sub) return res.status(404).json({ success: false, message: "Submission not found" });
      return res.status(200).json({ success: true, data: sub });
    } catch (error) {
      next(error);
    }
  }
}

export default new SubmissionController();