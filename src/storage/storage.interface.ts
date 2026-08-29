export interface UploadOptions {
  folder?: string;
  fileName: string;
  mimeType: string;
  isPublic: boolean;
}

export interface StorageUploadResult {
  key: string;
  url?: string;
  location: string;
  driver: string;
}

export interface StorageDriver {
  name: string;
  upload(buffer: Buffer, options: UploadOptions): Promise<StorageUploadResult>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  getPublicUrl(key: string): string | null;
}