import { Document } from "mongoose";

export type ExperienceType = "full_page" | "popup" | "banner" | "redirect";

export type ExperienceTriggerType =
  | "always"
  | "timer"
  | "exit_intent"
  | "scroll"
  | "custom_event";

export type ExperienceTargetScope = "global" | "routes";

export type ExperienceModuleType =
  | "form"
  | "action"
  | "automation"
  | "tracking";

export interface IExperienceTarget {
  scope: ExperienceTargetScope;
  routes?: string[];
  excludeRoutes?: string[];
}

export interface IExperienceTrigger {
  type: ExperienceTriggerType;
  value?: number | string;
}

export interface IExperienceSchedule {
  startAt?: Date;
  endAt?: Date;
}

export interface IExperienceModule {
  type: ExperienceModuleType;
  key: string;
  config: Record<string, any>;
}

export interface IExperience extends Document {
  key: string;
  name: string;

  type: ExperienceType;

  componentKey: string;

  enabled: boolean;

  priority: number;

  target: IExperienceTarget;

  trigger?: IExperienceTrigger;

  schedule?: IExperienceSchedule;

  modules?: IExperienceModule[];

  payload: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}
