// src/modules/course/course.model.ts
import { Schema, model } from "mongoose";
import { ICourse } from "./course.interface";

const lessonContentSchema = new Schema({
  videoMediaId: { type: Schema.Types.ObjectId, ref: "Media" },
  fileMediaId: { type: Schema.Types.ObjectId, ref: "Media" },
  textContent: { type: String },
  assignmentInstructions: { type: String },
  transcriptKey: { type: String },
}, { _id: false });

const lessonSchema = new Schema({
  id: { type: String, required: true },
  order: { type: Number, default: 0 },
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ["video", "text", "quiz", "exam", "assignment", "file"],
    required: true,
  },
  duration: { type: Number, default: 0 },
  freePreview: { type: Boolean, default: false },
  dripDays: { type: Number, default: 0, min: 0 },
  quizId: { type: Schema.Types.ObjectId, ref: "Quiz" },
  content: { type: lessonContentSchema, default: () => ({}) },
}, { _id: false });

const sectionSchema = new Schema({
  id: { type: String, required: true },
  order: { type: Number, default: 0 },
  title: { type: String, required: true },
  description: { type: String },
  lessons: [lessonSchema],
}, { _id: false });

const oneTimePricingSchema = new Schema({
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "USD", uppercase: true },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  originalPrice: { type: Number },
}, { _id: false });

const subscriptionTierSchema = new Schema({
  id: { type: String, required: true },
  interval: { type: String, enum: ["weekly", "monthly", "yearly"], required: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const courseSchema = new Schema<ICourse>({
  title: { type: String, required: true, trim: true },
  subtitle: { type: String },
  description: { type: String, required: true },
  category: { type: String, required: true, index: true },
  subcategory: { type: String },
  tags: { type: [String], index: true },
  difficulty: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
  language: { type: String, default: "English" },
  thumbnailMediaId: { type: Schema.Types.ObjectId, ref: "Media" },
  promoVideoMediaId: { type: Schema.Types.ObjectId, ref: "Media" },
  badge: { type: String },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  seoTitle: { type: String },
  seoDescription: { type: String },
  learningObjectives: { type: [String], default: [] },
  requirements: { type: [String], default: [] },
  audience: { type: [String], default: [] },
  sections: { type: [sectionSchema], default: [] },
  priceModel: { type: String, enum: ["free", "onetime", "subscription"], default: "onetime" },
  oneTimePricing: { type: oneTimePricingSchema },
  subscriptionTiers: { type: [subscriptionTierSchema], default: [] },
  enrollmentLimit: { type: Number, default: 0, min: 0 },
  enrollmentsPaused: { type: Boolean, default: false },
  enrollmentsOpenAt: { type: Date },
  prerequisites: { type: [{ type: Schema.Types.ObjectId, ref: "Course" }], default: [] },
  certificateEnabled: { type: Boolean, default: false },
  certificateAutoIssue: { type: Boolean, default: true },
  certificateTemplate: { type: String, default: "default" },
  completionCriteria: {
    type: String,
    enum: ["watch_all", "pass_quiz", "pass_exam", "manual"],
    default: "watch_all",
  },
  accessDuration: { type: Number, default: 0, min: 0 },
  instructorBio: { type: String },
  integrations: { type: [String], default: [] },
  courseLevel: { type: String, enum: ["all", "beginner", "intermediate", "advanced"], default: "all" },
  status: {
    type: String,
    enum: ["draft", "published", "archived", "under_review"],
    default: "draft",
    index: true,
  },
  teacher: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

  publishedAt: { type: Date, default: null },
  sectionsCount: { type: Number, default: 0 },
  lessonsCount: { type: Number, default: 0 },
  totalDurationSec: { type: Number, default: 0 },
  enrollmentCount: { type: Number, default: 0 },
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  revenueCents: { type: Number, default: 0 },

  transcriptReady: { type: Boolean, default: false },
  embeddingRef: { type: String },
  aiSummary: { type: String },

  // ── Deletion & retention ──
  deletedAt: { type: Date, index: true },                 // no default so $exists:false works
  mediaRetentionUntil: { type: Date, index: true },
  deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  deletionReason: { type: String },
  hardPurgedAt: { type: Date, index: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  minimize: false,
});

courseSchema.index({ teacher: 1, status: 1, createdAt: -1 });
courseSchema.index({ status: 1, publishedAt: -1 });
courseSchema.index({ title: "text", description: "text", tags: "text" });
courseSchema.index({ mediaRetentionUntil: 1, hardPurgedAt: 1 });

// ---- Hooks ----

courseSchema.pre("validate", function (next) {
  if (this.sections) {
    this.sections.forEach((s, si) => {
      if (s.order == null) s.order = si;
      s.lessons.forEach((l, li) => {
        if (l.order == null) l.order = li;
      });
    });

    this.sectionsCount = this.sections.length;
    this.lessonsCount = this.sections.reduce((a, s) => a + s.lessons.length, 0);
    this.totalDurationSec = this.sections.reduce(
      (a, s) => a + s.lessons.reduce((la, l) => la + (l.duration || 0) * 60, 0),
      0
    );
  }

  if (this.priceModel === "onetime" && this.oneTimePricing) {
    const op = this.oneTimePricing;
    if (op.discountPercent && op.discountPercent > 0 && !op.originalPrice) {
      op.originalPrice = parseFloat((op.price / (1 - op.discountPercent / 100)).toFixed(2));
    }
  }

  if (this.priceModel === "subscription" && this.subscriptionTiers) {
    this.subscriptionTiers.forEach((t) => {
      if (t.discountPercent && t.discountPercent > 0 && !t.originalPrice) {
        t.originalPrice = parseFloat((t.price / (1 - t.discountPercent / 100)).toFixed(2));
      }
    });
  }

  next();
});

courseSchema.pre("save", function (next) {
  if (this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

export default model<ICourse>("Course", courseSchema);