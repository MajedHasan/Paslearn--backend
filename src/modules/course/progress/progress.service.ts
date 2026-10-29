// src/modules/progress/progress.service.ts
import ProgressModel from "./progress.model";
import { enrollmentService } from "../enrollment/enrollment.service";
import { Types } from "mongoose";

export const progressService = {
  async record(params: {
    userId: string;
    courseId: string;
    sectionId: string;
    lessonId: string;
    watchedSeconds?: number;
    lastPositionSec?: number;
    isCompleted?: boolean;
  }) {
    const update: any = {
      watchedSeconds: params.watchedSeconds,
      lastPositionSec: params.lastPositionSec,
    };
    if (params.isCompleted === true) {
      update.isCompleted = true;
      update.completedAt = new Date();
    }
    // strip undefined
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    const doc = await ProgressModel.findOneAndUpdate(
      { user: params.userId, course: params.courseId, lessonId: params.lessonId },
      {
        $set: update,
        $setOnInsert: {
          sectionId: params.sectionId,
          user: params.userId,
          course: params.courseId,
          lessonId: params.lessonId,
        },
      },
      { upsert: true, new: true }
    );

    // Recompute enrollment progress
    const enrollment = await enrollmentService.recomputeProgress(
      params.userId,
      params.courseId
    );

    return { progress: doc, enrollment };
  },

  async getForCourse(userId: string, courseId: string) {
    return ProgressModel.find({ user: userId, course: courseId }).lean();
  },
};