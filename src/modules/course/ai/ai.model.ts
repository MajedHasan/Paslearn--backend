import { Schema, model } from "mongoose";
import { IAiJob } from "./ai.interface";

const aiJobSchema = new Schema<IAiJob>({
  type: {
    type: String,
    enum: [
      "course.auto_quiz",
      "course.summary",
      "course.transcript",
      "course.chatbot",
      "course.translate",
      "course.personalized_path",
      "course.outline",
      "course.description_suggest",
      "course.tag_suggest",
    ],
    required: true,
    index: true,
  },
  refType: { type: String, enum: ["course", "lesson"], required: true },
  refId: { type: Schema.Types.Mixed, required: true }, 
  courseId: { type: Schema.Types.ObjectId, ref: "Course", index: true },

  status: {
    type: String,
    enum: ["queued", "processing", "done", "failed", "cancelled"],
    default: "queued",
    index: true,
  },
  input: { type: Schema.Types.Mixed },
  output: { type: Schema.Types.Mixed },
  error: String,

  tokensUsed: Number,
  provider: String,

  requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

aiJobSchema.index({ requestedBy: 1, createdAt: -1 });
aiJobSchema.index({ courseId: 1, type: 1, createdAt: -1 });
aiJobSchema.index({ refType: 1, refId: 1 }); 

export default model<IAiJob>("AiJob", aiJobSchema);