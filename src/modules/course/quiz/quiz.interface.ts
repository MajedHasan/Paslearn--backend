import { Document, Types } from "mongoose";

export type QuizKind = "lesson_quiz" | "course_exam";
export type QuestionType = "single_choice" | "multi_choice" | "true_false" | "short_text" | "long_text";

export interface IQuizQuestion {
  _id: Types.ObjectId;
  type: QuestionType;
  prompt: string;
  mediaUrl?: string;
  options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  correctText?: string;
  points: number;
  explanation?: string;
  order: number;
  // AI hooks
  isAiGenerated?: boolean;
  generatedFromLessonId?: string;
}

export interface IQuiz extends Document {
  course: Types.ObjectId;
  teacher: Types.ObjectId;
  kind: QuizKind;
  sectionId?: string;
  lessonId?: string;
  title: string;
  instructions?: string;
  questions: IQuizQuestion[];
  passingScore: number;      // 0-100
  timeLimitSec?: number;     // null = untimed
  maxAttempts: number;       // 0 = unlimited
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showCorrectAnswers: "never" | "after_pass" | "after_attempt";
  isPublished: boolean;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export type AttemptStatus = "in_progress" | "submitted" | "graded" | "expired";

export interface IQuizAttempt extends Document {
  user: Types.ObjectId;
  quiz: Types.ObjectId;
  course: Types.ObjectId;
  enrollment?: Types.ObjectId;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: Date;
  submittedAt?: Date | null;
  timeSpentSec?: number;
  answers: Array<{
    questionId: Types.ObjectId;
    answer: any;
    isCorrect?: boolean;
    pointsAwarded?: number;
  }>;
  score: number;
  maxScore: number;
  passed: boolean;
  certificatesUnlocked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}