import cron, { ScheduledTask } from "node-cron";
import {
  listCronJobs,
  getCronJob,
} from "./cron.registry";
import { CronJobDefinition, CronRunRecord } from "./cron.interface";
import { AppError } from "../../utils/appError";

const MAX_HISTORY = 20;
const tasks = new Map<string, ScheduledTask>();

export const cronService = {
  /**
   * Start every registered cron job whose `enabled` flag is true.
   * Safe to call twice — duplicate tasks are stopped and replaced.
   */
  startAll() {
    for (const job of listCronJobs()) {
      if (!job.enabled) {
        console.log(`[cron] skipped (disabled): ${job.name}`);
        continue;
      }
      this.start(job.name);
    }
  },

  start(name: string) {
    const job = getCronJob(name);
    if (!job) throw new AppError(`Cron job not found: ${name}`, 404);

    // stop existing
    const prev = tasks.get(name);
    if (prev) {
      prev.stop();
      tasks.delete(name);
    }

    const task = cron.schedule(job.schedule, async () => {
      await this.execute(job, "schedule");
    });

    tasks.set(name, task);
    console.log(`[cron] started: ${job.name} (${job.schedule})`);
  },

  stop(name: string) {
    const task = tasks.get(name);
    if (task) {
      task.stop();
      tasks.delete(name);
      console.log(`[cron] stopped: ${name}`);
    }
  },

  stopAll() {
    for (const [name, task] of tasks) {
      task.stop();
      console.log(`[cron] stopped: ${name}`);
    }
    tasks.clear();
  },

  /**
   * Run a job immediately (used for manual triggers from admin).
   */
  async runNow(name: string, userId?: string) {
    const job = getCronJob(name);
    if (!job) throw new AppError(`Cron job not found: ${name}`, 404);
    return this.execute(job, "manual", userId);
  },

  async execute(
    job: CronJobDefinition,
    trigger: "schedule" | "manual",
    userId?: string
  ): Promise<CronRunRecord> {
    const record: CronRunRecord = {
      startedAt: new Date(),
      status: "success",
      triggeredBy: trigger,
      triggeredByUserId: userId,
    };
    console.log(`[cron] running: ${job.name} (${trigger})`);

    try {
      const result = await job.handler();
      record.result = result;
      record.completedAt = new Date();
      job.runCount += 1;
      console.log(`[cron] done: ${job.name}`);
    } catch (err: any) {
      record.status = "error";
      record.error = err?.message || "Unknown error";
      record.completedAt = new Date();
      job.errorCount += 1;
      console.error(`[cron] failed: ${job.name}`, err?.message);
    }

    job.lastRun = record;
    job.history.unshift(record);
    if (job.history.length > MAX_HISTORY) job.history.length = MAX_HISTORY;
    return record;
  },

  setEnabled(name: string, enabled: boolean) {
    const job = getCronJob(name);
    if (!job) throw new AppError(`Cron job not found: ${name}`, 404);
    job.enabled = enabled;
    if (enabled) this.start(name);
    else this.stop(name);
    return job;
  },

  getStatus() {
    return listCronJobs().map((j) => ({
      name: j.name,
      description: j.description,
      schedule: j.schedule,
      enabled: j.enabled,
      tags: j.tags || [],
      running: tasks.has(j.name),
      lastRun: j.lastRun,
      runCount: j.runCount,
      errorCount: j.errorCount,
      recentHistory: j.history.slice(0, 5),
    }));
  },
};