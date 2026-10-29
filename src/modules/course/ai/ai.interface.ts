import { Document, Types } from "mongoose";

export type AiJobType =
  | "course.auto_quiz"
  | "course.summary"
  | "course.transcript"
  | "course.chatbot"
  | "course.translate"
  | "course.personalized_path"
  | "course.outline"
  | "course.description_suggest"
  | "course.tag_suggest";

export type AiJobStatus = "queued" | "processing" | "done" | "failed" | "cancelled";

export type AiJobRefType = "course" | "lesson";

export interface IAiJob extends Document {
  type: AiJobType;
  refType: AiJobRefType;
  refId: Types.ObjectId | string;
  courseId?: Types.ObjectId;

  status: AiJobStatus;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;

  tokensUsed?: number;
  provider?: string;

  requestedBy: Types.ObjectId;

  startedAt?: Date | null;
  completedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}