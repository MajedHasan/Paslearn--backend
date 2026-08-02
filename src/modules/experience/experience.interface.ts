import { Document } from "mongoose";

// ── How the experience is displayed ─────────────────────
export type ExperienceType = "full_page" | "popup" | "banner" | "redirect";

// ── When it triggers ─────────────────────────────────────
export type ExperienceTriggerType =
  | "always"
  | "timer"
  | "exit_intent"
  | "scroll"
  | "custom_event";

// ── Where it appears ─────────────────────────────────────
export type ExperienceTargetScope = "global" | "routes";

export interface IExperienceTarget {
  scope: ExperienceTargetScope;
  routes?: string[];
  excludeRoutes?: string[];
}

export interface IExperienceTrigger {
  type: ExperienceTriggerType;
  /** value meaning depends on the trigger type (ms for timer, % for scroll, etc.) */
  value?: number | string;
}

export interface IExperienceSchedule {
  startAt?: Date;
  endAt?: Date;
}

// ── What to show ─────────────────────────────────────────
export type ExperienceContentType = "form" | "page";

export interface IExperienceContent {
  /** Type of resource to display */
  resourceType: ExperienceContentType;

  /** ObjectId of the resource (form ID or page ID) */
  resourceId?: string;

  /** Human‑readable key (form key, page slug) for public API lookup */
  resourceKey?: string;

  /** Optional title override */
  titleOverride?: string;
}

// ── Type‑specific display options ────────────────────────
export interface IPopupOptions {
  position?:
    | "center"
    | "top"
    | "bottom"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  size?: "small" | "medium" | "large";
  overlayOpacity?: number;        // 0–1
  closeButton?: boolean;
  animation?: "fade" | "slide-up" | "scale";
}

export interface IBannerOptions {
  placement?: "top" | "bottom";
  sticky?: boolean;
  dismissible?: boolean;
  height?: string;                // CSS value, e.g. "60px"
  animation?: "slide-down" | "fade";
}

export interface IRedirectOptions {
  delayMs?: number;
  newTab?: boolean;
}

export interface IFullPageOptions {
  /** optional layout style for the full page */
  layout?: "centered" | "wide";
  background?: string;            // CSS background value
}

/** Union of all possible option types – only the relevant one will be populated */
export type ExperienceOptions =
  | IPopupOptions
  | IBannerOptions
  | IRedirectOptions
  | IFullPageOptions
  | Record<string, any>;          // fallback for future types

// ── Analytics (future‑proof, populated at runtime) ───────
export interface IExperienceAnalytics {
  views: number;
  interactions: number;
  conversions: number;
  lastViewedAt?: Date;
}

// ── Main Experience Document ─────────────────────────────
export interface IExperience extends Document {
  /** Unique slug – auto‑generated from name if not provided */
  key: string;

  /** Human‑readable name */
  name: string;

  /** The display style */
  type: ExperienceType;

  /** Whether the experience is currently active */
  enabled: boolean;

  /** Higher priority = shown first when multiple match */
  priority: number;

  /** Where the experience should appear */
  target: IExperienceTarget;

  /** When the experience should appear */
  trigger?: IExperienceTrigger;

  /** Optional date range */
  schedule?: IExperienceSchedule;

  /** What to show inside the experience */
  content?: IExperienceContent;

  /** Type‑specific display options (position, size, animation, etc.) */
  options?: ExperienceOptions;

  /** Free‑form extra data (title, message, button text, images, etc.) */
  payload: Record<string, any>;

  /** Analytics data – populated at runtime, not stored in the document */
  analytics?: IExperienceAnalytics;

  createdAt: Date;
  updatedAt: Date;
}