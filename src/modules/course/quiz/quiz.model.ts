import { Schema, model } from "mongoose";
import { IQuiz, IQuizAttempt } from "./quiz.interface";

const questionSchema = new Schema<IQuiz["questions"][number]>({
  type: { type: String, enum: ["single_choice", "multi_choice", "true_false", "short_text", "long_text"], required: true },
  prompt: { type: String, required: true },
  mediaUrl: String,
  options: [{ id: String, text: String, isCorrect: Boolean }],
  correctText: String,
  points: { type: Number, default: 1, min: 0 },
  explanation: String,
  order: { type: Number, default: 0 },
  isAiGenerated: { type: Boolean, default: false },
  generatedFromLessonId: String,
});

const quizSchema = new Schema<IQuiz>({
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  teacher: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  kind: { type: String, enum: ["lesson_quiz", "course_exam"], required: true },
  sectionId: String,
  lessonId: String,
  title: { type: String, required: true },
  instructions: String,
  questions: { type: [questionSchema], default: [] },
  passingScore: { type: Number, default: 70, min: 0, max: 100 },
  timeLimitSec: Number,
  maxAttempts: { type: Number, default: 0, min: 0 },
  shuffleQuestions: { type: Boolean, default: false },
  shuffleOptions: { type: Boolean, default: false },
  showCorrectAnswers: { type: String, enum: ["never", "after_pass", "after_attempt"], default: "after_attempt" },
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true });

quizSchema.index({ course: 1, kind: 1 });
quizSchema.index({ lessonId: 1 });

const attemptSchema = new Schema<IQuizAttempt>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  quiz: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  enrollment: { type: Schema.Types.ObjectId, ref: "Enrollment" },
  attemptNumber: { type: Number, required: true },
  status: { type: String, enum: ["in_progress", "submitted", "graded", "expired"], default: "in_progress" },
  startedAt: { type: Date, default: () => new Date() },
  submittedAt: { type: Date, default: null },
  timeSpentSec: Number,
  answers: [{
    questionId: { type: Schema.Types.ObjectId },
    answer: Schema.Types.Mixed,
    isCorrect: Boolean,
    pointsAwarded: Number,
  }],
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  certificatesUnlocked: { type: Boolean, default: false },
}, { timestamps: true });

attemptSchema.index({ user: 1, quiz: 1, attemptNumber: -1 });
attemptSchema.index({ quiz: 1, status: 1 });

export const QuizModel = model<IQuiz>("Quiz", quizSchema);
export const QuizAttemptModel = model<IQuizAttempt>("QuizAttempt", attemptSchema);