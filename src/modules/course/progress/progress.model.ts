// src/modules/progress/progress.model.ts
import { Schema, model } from "mongoose";
import { IProgress } from "./progress.interface";

const progressSchema = new Schema<IProgress>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  sectionId: { type: String, required: true },
  lessonId: { type: String, required: true },
  watchedSeconds: { type: Number, default: 0 },
  lastPositionSec: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
}, { timestamps: { createdAt: false, updatedAt: true } });

progressSchema.index({ user: 1, course: 1, lessonId: 1 }, { unique: true });
progressSchema.index({ user: 1, course: 1, isCompleted: 1 });

export default model<IProgress>("Progress", progressSchema);