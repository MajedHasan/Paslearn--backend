// src/modules/course/course.interface.ts
import { Document, Types } from "mongoose";

export type LessonType = "video" | "text" | "quiz" | "assignment" | "file";
export type QuestionType = "multiple_choice" | "true_false" | "short_answer";
export type CourseStatus = "draft" | "published" | "archived" | "under_review";
export type PriceModel = "free" | "onetime" | "subscription";
export type SubscriptionInterval = "weekly" | "monthly" | "yearly";
export type CompletionCriteria = "watch_all" | "pass_quiz" | "manual";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type CourseLevel = "all" | "beginner" | "intermediate" | "advanced";

export interface IQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  explanation?: string;   // optional answer explanation
}

export interface ILessonContent {
  videoUrl?: string;      // URL or media ID
  videoEmbed?: string;
  textContent?: string;
  quizQuestions?: IQuestion[];
  assignmentInstructions?: string;
  fileUrl?: string;
  videoMediaId?: string;  // reference to Media collection
  fileMediaId?: string;
}

export interface ILesson {
  id: string;
  title: string;
  type: LessonType;
  duration?: number;        // in minutes
  freePreview: boolean;
  dripDays: number;
  content: ILessonContent;
}

export interface ISection {
  id: string;
  title: string;
  description?: string;    // optional section description
  lessons: ILesson[];
}

export interface IOneTimePricing {
  price: number;
  currency: string;
  discountPercent?: number;      // optional sale discount
  originalPrice?: number;        // if discounted, original price
}

export interface ISubscriptionTier {
  id: string;
  interval: SubscriptionInterval;
  price: number;                // final price after discount
  originalPrice?: number;       // base price before discount
  discountPercent?: number;     // discount percentage from originalPrice
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
  promoVideo?: string;
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
  discountPercent: number;          // legacy global discount (deprecated)
  couponCode?: string;
  enrollmentLimit: number;
  prerequisites: Types.ObjectId[];  // reference to other courses
  certificateEnabled: boolean;
  certificateTemplate: string;
  completionCriteria: CompletionCriteria;
  accessDuration: number;
  instructorBio?: string;
  integrations: string[];
  courseLevel: CourseLevel;
  status: CourseStatus;             // draft, published, archived, under_review
  teacher: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}