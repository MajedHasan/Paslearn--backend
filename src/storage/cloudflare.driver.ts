import { StorageDriver, UploadOptions } from "./storage.interface";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "../config/r2Client";
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class CloudflareR2Driver implements StorageDriver {
  name = "cloudflare_r2";

  async upload(buffer: Buffer, options: UploadOptions) {
    const { folder = "", fileName, mimeType, isPublic } = options;
    const key = `${folder ? folder.replace(/^\/+|\/+$/g, "") + "/" : ""}${Date.now()}-${fileName}`;
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    const url = isPublic && R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : undefined;
    return { key, url, location: key, driver: this.name };
  }

  async delete(key: string) {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
  }

  async getSignedUrl(key: string, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    return getSignedUrl(r2Client, command, { expiresIn });
  }

  getPublicUrl(key: string) {
    return R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : null;
  }
}