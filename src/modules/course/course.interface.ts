// src/modules/course/course.interface.ts
import { Document, Types } from "mongoose";

export type LessonType = "video" | "text" | "quiz" | "exam" | "assignment" | "file";
export type CourseStatus = "draft" | "published" | "archived" | "under_review";
export type PriceModel = "free" | "onetime" | "subscription";
export type SubscriptionInterval = "weekly" | "monthly" | "yearly";
export type CompletionCriteria = "watch_all" | "pass_quiz" | "pass_exam" | "manual";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type CourseLevel = "all" | "beginner" | "intermediate" | "advanced";

export interface ILessonContent {
  videoMediaId?: Types.ObjectId | string | null;
  fileMediaId?: Types.ObjectId | string | null;
  textContent?: string;
  assignmentInstructions?: string;
  transcriptKey?: string;
  // read-time enrichment:
  videoMediaName?: string;
  fileMediaName?: string;
}

export interface ILesson {
  id: string;
  order: number;
  title: string;
  type: LessonType;
  duration?: number;       // minutes
  freePreview: boolean;
  dripDays: number;
  quizId?: Types.ObjectId;
  content: ILessonContent;
}

export interface ISection {
  id: string;
  order: number;
  title: string;
  description?: string;
  lessons: ILesson[];
}

export interface IOneTimePricing {
  price: number;
  currency: string;
  discountPercent?: number;
  originalPrice?: number;
}

export interface ISubscriptionTier {
  id: string;
  interval: SubscriptionInterval;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  isActive: boolean;
}

export interface ICourse extends Document {
  title: string;
  subtitle?: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  difficulty: Difficulty;
  language: string;
  thumbnailMediaId?: Types.ObjectId;
  promoVideoMediaId?: Types.ObjectId;
  badge?: string;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  learningObjectives: string[];
  requirements: string[];
  audience: string[];
  sections: ISection[];
  priceModel: PriceModel;
  oneTimePricing?: IOneTimePricing;
  subscriptionTiers?: ISubscriptionTier[];
  enrollmentLimit: number;         // 0 = unlimited
  enrollmentsPaused: boolean;
  enrollmentsOpenAt?: Date;
  prerequisites: Types.ObjectId[];
  certificateEnabled: boolean;
  certificateAutoIssue: boolean;
  certificateTemplate: string;
  completionCriteria: CompletionCriteria;
  accessDuration: number;          // days; 0 = lifetime
  instructorBio?: string;
  integrations: string[];
  courseLevel: CourseLevel;
  status: CourseStatus;
  teacher: Types.ObjectId;

  // Denormalized counters (maintained by hooks & events)
  publishedAt?: Date | null;
  sectionsCount: number;
  lessonsCount: number;
  totalDurationSec: number;
  enrollmentCount: number;
  ratingAvg: number;
  ratingCount: number;
  revenueCents: number;

  // AI hooks
  transcriptReady: boolean;
  embeddingRef?: string;
  aiSummary?: string;

  // ── Deletion & retention ──
  deletedAt?: Date | null;
  mediaRetentionUntil?: Date | null;
  deletedBy?: Types.ObjectId | null;
  deletionReason?: string;
  hardPurgedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}