// src/services/transcoder.ts
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import { getStorageDriver } from "../storage/storage.factory";
import MediaModel from "../modules/media/media.model";

const renditions = [
  { resolution: "720p", scale: "1280x720", bitrate: "2000k" },
  { resolution: "480p", scale: "854x480", bitrate: "1000k" },
  { resolution: "360p", scale: "640x360", bitrate: "600k" },
];

export async function startTranscoding(mediaId: string) {
  // Run in background
  setImmediate(async () => {
    try {
      const media = await MediaModel.findById(mediaId);
      if (!media) return;

      const driver = getStorageDriver();
      const inputUrl = await driver.getSignedUrl(media.key!, 3600);

      const uploadedMediaIds = [];

      for (const rend of renditions) {
        const outputPath = `/tmp/${media._id}-${rend.resolution}.mp4`;
        await new Promise((resolve, reject) => {
          ffmpeg(inputUrl)
            .outputOptions([`-vf scale=${rend.scale}`, `-b:v ${rend.bitrate}`])
            .output(outputPath)
            .on("end", resolve)
            .on("error", reject)
            .run();
        });

        const buffer = await fs.readFile(outputPath);
        const uploadResult = await driver.upload(buffer, {
          folder: media.folder || "",
          fileName: `${media._id}-${rend.resolution}.mp4`,
          mimeType: "video/mp4",
          isPublic: media.visibility === "public",
        });

        const renditionMedia = await MediaModel.create({
          user: media.user,
          folder: media.folder,
          name: `${media.name} (${rend.resolution})`,
          parentFolderId: media.parentFolderId,
          isFolder: false,
          key: uploadResult.key,
          url: uploadResult.url,
          originalName: `${media._id}-${rend.resolution}.mp4`,
          mimeType: "video/mp4",
          size: buffer.length,
          extension: "mp4",
          status: "ready",
          visibility: media.visibility,
          storageDriver: uploadResult.driver,
          metadata: {
            originalMediaId: media._id,
            resolution: rend.resolution,
          },
        });

        uploadedMediaIds.push(renditionMedia._id);
        await fs.unlink(outputPath).catch(() => {});
      }

      media.status = "ready";
      media.metadata = { ...media.metadata, transcoded: true, renditionMediaIds: uploadedMediaIds };
      await media.save();
    } catch (err) {
      console.error("Transcoding failed:", err);
      const media = await MediaModel.findById(mediaId);
      if (media) {
        media.status = "failed";
        const errorMessage = err instanceof Error ? err.message : String(err);
        media.metadata = { ...media.metadata, error: errorMessage };
        await media.save();
      }
    }
  });
}