// src/modules/course/course.controller.ts
import { Request, Response, NextFunction } from "express";
import { createCrudController } from "../cruds/crud.controller";
import { courseService } from "./course.service";
import { parseListQuery } from "../cruds/utils.query";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { R2_BUCKET_NAME, r2Client } from "../../config/r2Client";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import mediaModel from "../media/media.model";

const baseController = createCrudController(courseService);

export const courseController = {
  ...baseController,

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pq = parseListQuery(req, { page: 1, limit: 10 });
      // Force filter to current teacher
      pq.filter.teacher = (req as any).user._id || (req as any).user.sub;
      const result = await courseService.list({
        ...pq,
        userId: (req as any).user._id || (req as any).user.sub,
        searchFields: ["title", "description"],
      });

      // Find the thumbnail key from the thumbnailMediaId and get the signed URL for the thumbnail
      for (const course of result.data) {
        if (course.thumbnailMediaId && course.thumbnailMediaId.key) {
          try {
            const command = new GetObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: course.thumbnailMediaId.key,
            });
            const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
            course.thumbnailMediaId.url = signedUrl;
          } catch (err) {
            console.error(`Error generating signed URL for thumbnail ${course.thumbnailMediaId._id}:`, err);
          }
        }
      } 

      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  // Override get to normalize populate
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      let populate: string | string[] | undefined = req.query.populate as any;
      if (typeof populate === "string") {
        populate = populate.includes(",") ? populate.split(",").map((p) => p.trim()) : populate;
      }
      const doc = await courseService.getById(id, { populate });
      if (!doc) return res.status(404).json({ success: false, message: "Course not found" });


      // Find the Video Lessions and then get the signed URL for each lesson video
      for (const section of doc.sections || []) {
        for (const lesson of section.lessons || []) {
          if (lesson.type === "video" && lesson.content.videoMediaId) {
            try {

              const media = await mediaModel.findById(lesson.content.videoMediaId);
              if (!media) {
                console.error(`Media not found for lesson ${lesson._id} with key ${lesson.content.videoUrl}`);
                continue;
              }

              const command = new GetObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: media?.key as string,
              });
              const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
              lesson.content.videoUrl = signedUrl;
            } catch (err) {
              console.error(`Error generating signed URL for lesson ${lesson._id}:`, err);
            }
          }
        }
      } 

      // Find the thumbnail key from the thumbnailMediaId and get the signed URL for the thumbnail
      if (doc.thumbnailMediaId && doc.thumbnailMediaId.key) {
        try {
          const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: doc.thumbnailMediaId.key,
          });
          const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
          doc.thumbnailMediaId.url = signedUrl;
        } catch (err) {
          console.error(`Error generating signed URL for thumbnail ${doc.thumbnailMediaId._id}:`, err);
        }
      }


      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = await courseService.validatePricing(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }
      const doc = await courseService.create(req.body, { userId: (req as any).user._id || (req as any).user.sub });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.body.priceModel) {
        const validation = await courseService.validatePricing(req.body);
        if (!validation.valid) {
          return res.status(400).json({ success: false, message: validation.message });
        }
      }
      const doc = await courseService.update(req.params.id, req.body, { userId: (req as any).user._id || (req as any).user.sub });
      if (!doc) return res.status(404).json({ success: false, message: "Course not found" });
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

  // New stats endpoint
  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id || (req as any).user.sub;
      const stats = await courseService.getStatsForTeacher(userId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  },

  // Duplicate course
  async duplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const original = await courseService.getById(req.params.id, { populate: [] });
      if (!original) return res.status(404).json({ success: false, message: "Course not found" });

      // Remove id and timestamps, modify title
      const copy: any = { ...original };
      delete copy._id;
      delete copy.createdAt;
      delete copy.updatedAt;
      copy.title = `${original.title} (Copy)`;
      copy.status = "draft";
      copy.slug = `${original.slug}-copy-${Date.now()}`;

      const doc = await courseService.create(copy, {
        userId: (req as any).user._id || (req as any).user.sub,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  },

    // Bulk delete
  async bulkDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const ids: string[] = req.body.ids || [];
      if (ids.length === 0) {
        return res.status(400).json({ success: false, message: "No IDs provided" });
      }
      const result = await courseService.bulkDelete({ _id: { $in: ids } } as any);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  // Upload thumbnail
  async uploadThumbnail(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "No file" });
      const media = await courseService.uploadThumbnail(req.params.id, req.file);
      res.status(201).json({ success: true, data: media });
    } catch (err) {
      next(err);
    }
  },

  // Upload lesson video
  async uploadLessonVideo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "No file" });
      const { id: courseId, sectionId, lessonId } = req.params;
      const media = await courseService.uploadLessonVideo(courseId, sectionId, lessonId, req.file);
      res.status(201).json({ success: true, data: media });
    } catch (err) {
      next(err);
    }
  },

  // Upload lesson file
  async uploadLessonFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "No file" });
      const { id: courseId, sectionId, lessonId } = req.params;
      const media = await courseService.uploadLessonFile(courseId, sectionId, lessonId, req.file);
      res.status(201).json({ success: true, data: media });
    } catch (err) {
      next(err);
    }
  },

  // Transcode lesson video
  async transcodeLessonVideo(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: courseId, sectionId, lessonId } = req.params;
      const result = await courseService.transcodeLessonVideo(courseId, sectionId, lessonId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};