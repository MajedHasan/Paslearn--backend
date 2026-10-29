import { CronJobDefinition } from "./cron.interface";

const jobs = new Map<string, CronJobDefinition>();

export function registerCronJob(def: CronJobDefinition) {
  if (jobs.has(def.name)) {
    throw new Error(`[cron] duplicate job name: ${def.name}`);
  }
  jobs.set(def.name, { ...def, history: def.history || [] });
  console.log(`[cron] registered: ${def.name} (${def.schedule})`);
}

export function getCronJob(name: string): CronJobDefinition | undefined {
  return jobs.get(name);
}

export function listCronJobs(): CronJobDefinition[] {
  return Array.from(jobs.values());
}