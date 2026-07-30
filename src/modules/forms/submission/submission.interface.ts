import { Document, Types } from "mongoose";

export type SubmissionStatus = "new" | "reviewed" | "processed" | "failed";

export interface ISubmission extends Document {
  form: Types.ObjectId;           // ref to Form
  formKey: string;
  formSnapshot: Record<string, any>;
  values: Record<string, any>;    // submitted field data
  files?: {                       // uploaded files
    fieldKey: string;
    originalName: string;
    url: string;
    mimeType: string;
  }[];
  meta: Record<string, any>;      // browser / referrer info
  status: SubmissionStatus;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}