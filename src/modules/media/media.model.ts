import { Schema, model, Types } from "mongoose";
import { IMedia } from "./media.interface";

const mediaSchema = new Schema<IMedia>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    folder: { type: String, default: "" },
    name: { type: String, required: true },
    parentFolderId: { type: Schema.Types.ObjectId, ref: "Media", default: null },
    isFolder: { type: Boolean, default: false },
    key: { type: String, default: null },
    url: { type: String, default: null },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number, default: 0 },
    extension: { type: String },
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number },
    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "ready",
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    storageDriver: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

mediaSchema.index({ user: 1, parentFolderId: 1 });
mediaSchema.index({ user: 1, isFolder: 1 });

export default model<IMedia>("Media", mediaSchema);