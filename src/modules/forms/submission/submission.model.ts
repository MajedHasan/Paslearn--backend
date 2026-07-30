import mongoose, { Schema } from "mongoose";
import { ISubmission } from "./submission.interface";

const SubmissionSchema = new Schema<ISubmission>(
  {
    form: {
      type: Schema.Types.ObjectId,
      ref: "Form",
      required: true,
      index: true
    },
    formKey: {
      type: String,
      required: true,
      index: true
    },
    formSnapshot: {
      type: Schema.Types.Mixed,
      default: {}
    },
    values: {
      type: Schema.Types.Mixed,
      default: {}
    },
    files: [
      {
        fieldKey: String,
        originalName: String,
        url: String,
        mimeType: String,
      },
    ],
    meta: {
      type: Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ["new", "reviewed", "processed", "failed"],
      default: "new",
      index: true
    },
    notes: {
      type: String,
      default: ""
    },
  },
  { timestamps: true, versionKey: false }
);

SubmissionSchema.index({ form: 1, createdAt: -1 });
SubmissionSchema.index({ formKey: 1, createdAt: -1 });

export default mongoose.model<ISubmission>("Submission", SubmissionSchema);