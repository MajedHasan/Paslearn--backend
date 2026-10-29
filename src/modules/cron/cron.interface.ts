export interface CronRunRecord {
  startedAt: Date;
  completedAt?: Date;
  status: "success" | "error";
  error?: string;
  result?: any;
  triggeredBy: "schedule" | "manual";
  triggeredByUserId?: string;
}

export interface CronJobDefinition {
  name: string;                 // unique, e.g. "course.retention.cleanup"
  description: string;
  schedule: string;             // cron expression, e.g. "0 3 * * *"
  enabled: boolean;
  handler: () => Promise<any>;
  tags?: string[];              // for grouping, e.g. ["course", "retention"]

  // runtime stats
  lastRun?: CronRunRecord | null;
  runCount: number;
  errorCount: number;
  history: CronRunRecord[];     // in-memory, last N runs
}