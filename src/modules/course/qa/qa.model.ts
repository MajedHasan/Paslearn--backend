import { Schema, model } from "mongoose";
import { IQaThread } from "./qa.interface";

const answerSchema = new Schema<IQaThread["answers"][number]>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  body: { type: String, required: true },
  isInstructorAnswer: { type: Boolean, default: false },
  helpfulCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: () => new Date() },
}, { _id: true });

const qaThreadSchema = new Schema<IQaThread>({
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  teacher: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  lessonId: { type: String, index: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  isResolved: { type: Boolean, default: false, index: true },
  isPinned: { type: Boolean, default: false },
  answers: { type: [answerSchema], default: [] },
}, { timestamps: true });

qaThreadSchema.index({ course: 1, lessonId: 1, createdAt: -1 });

export default model<IQaThread>("QaThread", qaThreadSchema);