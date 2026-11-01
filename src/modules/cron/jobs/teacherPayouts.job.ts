import { registerCronJob } from "../cron.registry";
import { teacherPayoutService } from "../../teacher/earnings/payout.service";

registerCronJob({
  name: "teacher.payouts.autoCreate",
  description: "Auto-create payout requests for teachers with available balance (runs on 1st and 15th)",
  // Runs at 9am on the 1st and 15th of every month
  schedule: "0 9 1,15 * *",
  enabled: false, // ⭐ Disabled by default — enable when you're ready
  tags: ["teacher", "payouts"],
  runCount: 0,
  errorCount: 0,
  history: [],
  handler: async () => {
    return teacherPayoutService.autoCreatePayouts();
  },
});