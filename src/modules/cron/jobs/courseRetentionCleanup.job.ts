import { registerCronJob } from "../cron.registry";
import { courseService } from "../../course/course.service";
import UserModel from "../../../models/user.model";

/**
 * Purges courses whose 90-day media retention window has expired.
 * - Deletes: thumbnail, promo video, lesson videos (original + renditions), lesson files
 * - Removes: Media documents from MongoDB
 * - Preserves: Course tombstone (title, slug, hardPurgedAt) for audit trail
 *
 * Runs daily at 03:00 server time.
 */
registerCronJob({
  name: "course.retention.cleanup",
  description: "Purge courses whose 90-day media retention window expired",
  schedule: "0 3 * * *",
  enabled: true,
  tags: ["course", "retention", "media"],
  runCount: 0,
  errorCount: 0,
  history: [],
  handler: async () => {
    // Determine the "system user" for audit trail
    let systemUserId = process.env.CRON_SYSTEM_USER_ID;
    if (!systemUserId) {
      const admin = await UserModel.findOne({ role: "admin" }).select("_id").lean();
      systemUserId = (admin as any)?._id?.toString();
    }
    if (!systemUserId) {
      throw new Error(
        "No CRON_SYSTEM_USER_ID configured and no admin user found — cannot record purge audit trail"
      );
    }

    return courseService.cleanupExpiredCourses(systemUserId);
  },
});