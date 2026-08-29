import { Document, Types } from "mongoose";

export type MediaStatus = "processing" | "ready" | "failed";
export type MediaVisibility = "public" | "private";

export interface IMedia extends Document {
  user: Types.ObjectId;
  folder?: string;                // storage path prefix (e.g., courses/abc123)
  name: string;
  parentFolderId?: Types.ObjectId | null; // virtual folder parent
  isFolder: boolean;
  key?: string | null;
  url?: string | null;
  originalName?: string;
  mimeType?: string;
  size: number;
  extension?: string;
  width?: number;
  height?: number;
  duration?: number;
  status: MediaStatus;
  visibility: MediaVisibility;
  storageDriver?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}