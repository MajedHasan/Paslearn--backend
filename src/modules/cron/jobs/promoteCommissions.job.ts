import { registerCronJob } from "../cron.registry";
import { affiliateDashboardService } from "../../affiliate/dashboard.service";

registerCronJob({
  name: "affiliate.promote.commissions",
  description: "Promote pending commissions past their hold period to approved",
  schedule: "0 */6 * * *", // every 6 hours
  enabled: true,
  tags: ["affiliate", "commissions"],
  runCount: 0,
  errorCount: 0,
  history: [],
  handler: async () => {
    return affiliateDashboardService.promoteAllExpired();
  },
});