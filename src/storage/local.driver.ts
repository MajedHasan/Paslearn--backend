import { StorageDriver, UploadOptions } from "./storage.interface";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const BASE_DIR = process.env.LOCAL_UPLOAD_DIR || "uploads";

export class LocalStorageDriver implements StorageDriver {
  name = "local";

  async upload(buffer: Buffer, options: UploadOptions) {
    const { folder = "", fileName, isPublic } = options;
    const key = `${folder ? folder.replace(/^\/+|\/+$/g, "") + "/" : ""}${Date.now()}-${randomUUID()}-${fileName}`;
    const fullPath = path.join(BASE_DIR, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    const url = isPublic ? `/uploads/${key}` : undefined;
    return { key, url, location: fullPath, driver: this.name };
  }

  async delete(key: string) {
    const fullPath = path.join(BASE_DIR, key);
    await fs.unlink(fullPath).catch(() => {});
  }

  async getSignedUrl(key: string, expiresIn = 3600) {
    return this.getPublicUrl(key) || "";
  }

  getPublicUrl(key: string) {
    return `/uploads/${key}`;
  }
}