// src/modules/progress/progress.interface.ts
import { Document, Types } from "mongoose";

export interface IProgress extends Document {
  user: Types.ObjectId;
  course: Types.ObjectId;
  sectionId: string;
  lessonId: string;
  watchedSeconds: number;
  lastPositionSec: number;
  isCompleted: boolean;
  completedAt?: Date | null;
  updatedAt: Date;
}