import { Types } from "mongoose";
import MediaModel from "./media.model";
import { IMedia, MediaVisibility } from "./media.interface";
import { getStorageDriver } from "../../storage/storage.factory";

export interface UploadFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  userId: string;
  folder?: string;                 // storage path prefix (e.g., "courses/abc123")
  parentFolderId?: string | null;  // virtual folder parent
  visibility?: MediaVisibility;
  metadata?: Record<string, any>;
}

export class MediaService {
  async upload(input: UploadFileInput): Promise<IMedia> {
    const {
      buffer,
      originalName,
      mimeType,
      size,
      userId,
      folder = "",
      parentFolderId = null,
      visibility = "public",
      metadata = {},
    } = input;

    const driver = getStorageDriver();
    const extension = originalName.split(".").pop() || "";
    const fileName = `${Date.now()}-${originalName}`;

    const uploadResult = await driver.upload(buffer, {
      folder,
      fileName,
      mimeType,
      isPublic: visibility === "public",
    });

    const media = await MediaModel.create({
      user: new Types.ObjectId(userId),
      folder,
      name: originalName,
      parentFolderId: parentFolderId ? new Types.ObjectId(parentFolderId) : null,
      isFolder: false,
      key: uploadResult.key,
      url: uploadResult.url,
      originalName,
      mimeType,
      size,
      extension,
      status: "ready",
      visibility,
      storageDriver: uploadResult.driver,
      metadata,
    });

    return media.toObject();
  }

  async createFolder({
    userId,
    name,
    parentFolderId = null,
  }: {
    userId: string;
    name: string;
    parentFolderId?: string | null;
  }): Promise<IMedia> {
    const folder = await MediaModel.create({
      user: new Types.ObjectId(userId),
      name,
      parentFolderId: parentFolderId ? new Types.ObjectId(parentFolderId) : null,
      isFolder: true,
      size: 0,
      status: "ready",
      visibility: "public",
    });
    return folder.toObject();
  }

  async list({
    userId,
    parentFolderId = null,
    search,
    page = 1,
    limit = 100,
    includeFiles = true,
    includeFolders = true,
  }: {
    userId?: string;
    parentFolderId?: string | null;
    search?: string;
    page?: number;
    limit?: number;
    includeFiles?: boolean;
    includeFolders?: boolean;
  }) {
    const filter: any = { user: userId };
    filter.parentFolderId = parentFolderId ? new Types.ObjectId(parentFolderId) : null;
    if (!includeFiles) filter.isFolder = true;
    if (!includeFolders) filter.isFolder = false;
    if (search) filter.name = { $regex: search, $options: "i" };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      MediaModel.find(filter).sort({ isFolder: -1, name: 1 }).skip(skip).limit(limit).lean(),
      MediaModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string) {
    return MediaModel.findById(id).lean();
  }

  async getPresignedUrl(id: string, expiresIn = 3600) {
    const media = await MediaModel.findById(id);
    if (!media || media.isFolder) throw new Error("Not a file");
    if (media.visibility === "public" && media.url) return media.url;

    const driver = getStorageDriver();
    if (driver.name !== media.storageDriver) throw new Error("Storage driver mismatch");
    return driver.getSignedUrl(media.key!, expiresIn);
  }

  async delete(id: string) {
    const media = await MediaModel.findById(id);
    if (!media) throw new Error("Not found");

    if (media.isFolder) {
      // Recursively delete children
      const children = await MediaModel.find({ parentFolderId: media._id }).lean();
      for (const child of children) {
        await this.delete(child._id.toString());
      }
    } else if (media.key) {
      const driver = getStorageDriver();
      if (driver.name === media.storageDriver) {
        await driver.delete(media.key);
      }
    }

    await MediaModel.deleteOne({ _id: id });
    return { success: true };
  }
}

export const mediaService = new MediaService();