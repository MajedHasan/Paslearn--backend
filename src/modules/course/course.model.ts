// src/modules/course/course.model.ts
import { Schema, model, Types } from "mongoose";
import { ICourse } from "./course.interface";

const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["multiple_choice", "true_false", "short_answer"],
      required: true,
    },
    prompt: { type: String, required: true },
    options: [{ type: String }],
    correctAnswer: { type: String },
    points: { type: Number, default: 1 },
    explanation: { type: String },
  },
  { _id: false }
);

const lessonContentSchema = new Schema(
  {
    videoUrl: { type: String },
    videoEmbed: { type: String },
    textContent: { type: String },
    quizQuestions: [questionSchema],
    assignmentInstructions: { type: String },
    fileUrl: { type: String },
    videoMediaId: { type: String },
    fileMediaId: { type: String },
  },
  { _id: false }
);

const lessonSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["video", "text", "quiz", "assignment", "file"],
      required: true,
    },
    duration: { type: Number, default: 0 },
    freePreview: { type: Boolean, default: false },
    dripDays: { type: Number, default: 0 },
    content: { type: lessonContentSchema, default: {} },
  },
  { _id: false }
);

const sectionSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    lessons: [lessonSchema],
  },
  { _id: false }
);

const oneTimePricingSchema = new Schema(
  {
    price: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    discountPercent: { type: Number, default: 0 },
    originalPrice: { type: Number },
  },
  { _id: false }
);

const subscriptionTierSchema = new Schema(
  {
    id: { type: String, required: true },
    interval: {
      type: String,
      enum: ["weekly", "monthly", "yearly"],
      required: true,
    },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    discountPercent: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const courseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    description: { type: String, required: true },
    category: { type: String, required: true },
    subcategory: { type: String },
    tags: [{ type: String }],
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    language: { type: String, default: "English" },
    thumbnailMediaId: { type: Schema.Types.ObjectId, ref: "Media" },
    promoVideo: { type: String },
    badge: { type: String },
    slug: { type: String, unique: true, sparse: true },
    seoTitle: { type: String },
    seoDescription: { type: String },
    learningObjectives: [{ type: String }],
    requirements: [{ type: String }],
    audience: [{ type: String }],
    sections: [sectionSchema],
    priceModel: {
      type: String,
      enum: ["free", "onetime", "subscription"],
      default: "onetime",
    },
    oneTimePricing: { type: oneTimePricingSchema },
    subscriptionTiers: [subscriptionTierSchema],
    discountPercent: { type: Number, default: 0 },
    couponCode: { type: String },
    enrollmentLimit: { type: Number, default: 0 },
    prerequisites: [{ type: Schema.Types.ObjectId, ref: "Course" }],
    certificateEnabled: { type: Boolean, default: false },
    certificateTemplate: { type: String, default: "default" },
    completionCriteria: {
      type: String,
      enum: ["watch_all", "pass_quiz", "manual"],
      default: "watch_all",
    },
    accessDuration: { type: Number, default: 0 },
    instructorBio: { type: String },
    integrations: [{ type: String }],
    courseLevel: {
      type: String,
      enum: ["all", "beginner", "intermediate", "advanced"],
      default: "all",
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived", "under_review"],
      default: "draft",
    },
    teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

courseSchema.index({ teacher: 1, status: 1, createdAt: -1 });
courseSchema.index({ title: "text", description: "text" });

// Pre‑save hook to compute discounts if not provided
courseSchema.pre("save", function (next) {
  // For one‑time pricing: if discountPercent > 0 and originalPrice missing, compute from price
  if (this.priceModel === "onetime" && this.oneTimePricing) {
    const op = this.oneTimePricing;
    if (op.discountPercent && op.discountPercent > 0 && !op.originalPrice) {
      op.originalPrice = op.price;
      op.price = parseFloat(
        (op.originalPrice * (1 - op.discountPercent / 100)).toFixed(2)
      );
    }
  }

  // For subscription tiers: if discountPercent provided and originalPrice missing, compute
  if (this.priceModel === "subscription" && this.subscriptionTiers) {
    this.subscriptionTiers.forEach((tier) => {
      if (tier.discountPercent && tier.discountPercent > 0 && !tier.originalPrice) {
        tier.originalPrice = tier.price;
        tier.price = parseFloat(
          (tier.originalPrice * (1 - tier.discountPercent / 100)).toFixed(2)
        );
      }
    });
  }

  next();
});

export default model<ICourse>("Course", courseSchema);