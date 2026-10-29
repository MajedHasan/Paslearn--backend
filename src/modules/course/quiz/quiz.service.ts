import { QuizModel, QuizAttemptModel } from "./quiz.model";
import CourseModel from "../course.model";
import { entitlementService } from "../../entitlement/entitlement.service";
import { AppError } from "../../../utils/appError";
import { Types } from "mongoose";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function stripCorrectAnswers(quiz: any, includeAnswers: boolean) {
  return {
    ...quiz,
    questions: (quiz.questions || []).map((q: any) => {
      if (includeAnswers) return q;
      return {
        ...q,
        options: q.options?.map((o: any) => ({ id: o.id, text: o.text })),
        correctText: undefined,
        explanation: undefined,
      };
    }),
  };
}

function gradeAnswer(question: any, answer: any): { isCorrect: boolean; pointsAwarded: number } {
  if (question.type === "single_choice") {
    const correct = (question.options || []).find((o: any) => o.isCorrect)?.id;
    const ok = answer === correct;
    return { isCorrect: ok, pointsAwarded: ok ? question.points : 0 };
  }
  if (question.type === "multi_choice") {
    const correctIds = (question.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.id).sort();
    const given = Array.isArray(answer) ? [...answer].sort() : [];
    const ok = correctIds.length === given.length && correctIds.every((id: string, i: number) => id === given[i]);
    return { isCorrect: ok, pointsAwarded: ok ? question.points : 0 };
  }
  if (question.type === "true_false") {
    const ok = String(answer).toLowerCase() === String(question.correctText).toLowerCase();
    return { isCorrect: ok, pointsAwarded: ok ? question.points : 0 };
  }
  // short_text / long_text: auto-grade only exact match (case-insensitive). Teacher can re-grade.
  const ok = String(answer || "").trim().toLowerCase() === String(question.correctText || "").trim().toLowerCase();
  return { isCorrect: ok, pointsAwarded: ok ? question.points : 0 };
}

export const quizService = {
  // ─── Teacher authoring ───
  async createOrUpdate(courseId: string, teacherId: string, payload: any, quizId?: string) {
    const course = await CourseModel.findOne({ _id: courseId, teacher: teacherId, deletedAt: null });
    if (!course) throw new AppError("Course not found or not yours", 404);

    if (quizId) {
      const quiz = await QuizModel.findOne({ _id: quizId, course: courseId, teacher: teacherId });
      if (!quiz) throw new AppError("Quiz not found", 404);
      Object.assign(quiz, payload);
      if (quiz.isPublished && !quiz.publishedAt) quiz.publishedAt = new Date();
      await quiz.save();
      return quiz;
    }
    return QuizModel.create({ ...payload, course: courseId, teacher: teacherId });
  },

  async listForCourse(courseId: string, teacherId: string) {
    return QuizModel.find({ course: courseId, teacher: teacherId, deletedAt: null }).lean();
  },

  async deleteQuiz(quizId: string, teacherId: string) {
    const quiz = await QuizModel.findOneAndUpdate(
      { _id: quizId, teacher: teacherId },
      { deletedAt: new Date(), isPublished: false },
      { new: true }
    );
    if (!quiz) throw new AppError("Quiz not found", 404);
    return quiz;
  },

  // ─── Student flow ───
  async getForStudent(userId: string, quizId: string) {
    const quiz = await QuizModel.findOne({ _id: quizId, isPublished: true, deletedAt: null }).lean();
    if (!quiz) throw new AppError("Quiz not found", 404);
    const ent = await entitlementService.checkByRef(userId, "course", (quiz as any).course);
    if (!ent) throw new AppError("Not enrolled", 403);

    const attempts = await QuizAttemptModel.find({ user: userId, quiz: quizId }).sort({ attemptNumber: -1 }).lean();
    const bestPass = attempts.find((a) => a.passed);
    const canShow = (quiz as any).showCorrectAnswers === "after_attempt" && attempts.length > 0
      || (quiz as any).showCorrectAnswers === "after_pass" && !!bestPass;

    const finalQuiz = stripCorrectAnswers(quiz, canShow);
    return {
      quiz: finalQuiz,
      attempts: attempts.map((a) => ({
        _id: a._id, attemptNumber: a.attemptNumber, status: a.status,
        score: a.score, maxScore: a.maxScore, passed: a.passed,
        startedAt: a.startedAt, submittedAt: a.submittedAt,
      })),
      canStart: (quiz as any).maxAttempts === 0 || attempts.length < (quiz as any).maxAttempts,
    };
  },

  async startAttempt(userId: string, quizId: string) {
    const quiz = await QuizModel.findOne({ _id: quizId, isPublished: true, deletedAt: null });
    if (!quiz) throw new AppError("Quiz not found", 404);

    const ent = await entitlementService.checkByRef(userId, "course", (quiz as any).course);
    if (!ent) throw new AppError("Not enrolled", 403);

    const past = await QuizAttemptModel.find({ user: userId, quiz: quizId });
    if (quiz.maxAttempts > 0 && past.length >= quiz.maxAttempts) {
      throw new AppError("Attempt limit reached", 400);
    }
    const inProgress = past.find((a) => a.status === "in_progress");
    if (inProgress) return { attempt: inProgress, quiz: stripCorrectAnswers(quiz.toObject(), false) };

    // Shuffle snapshot — freezes the order for this attempt
    let questions = [...quiz.questions];
    if (quiz.shuffleQuestions) questions = shuffle(questions);

    const attempt = await QuizAttemptModel.create({
      user: userId,
      quiz: quiz._id,
      course: (quiz as any).course,
      attemptNumber: past.length + 1,
      status: "in_progress",
      startedAt: new Date(),
      answers: questions.map((q) => ({ questionId: q._id, answer: null })),
      maxScore: questions.reduce((a, q) => a + (q.points || 0), 0),
    });

    const view = stripCorrectAnswers(quiz.toObject(), false);
    if (quiz.shuffleOptions) {
      view.questions = view.questions.map((q: any) => ({
        ...q,
        options: q.options ? shuffle(q.options) : q.options,
      }));
    }
    return { attempt, quiz: view };
  },

  async submitAttempt(userId: string, attemptId: string, answers: Array<{ questionId: string; answer: any }>) {
    const attempt = await QuizAttemptModel.findOne({ _id: attemptId, user: userId });
    if (!attempt) throw new AppError("Attempt not found", 404);
    if (attempt.status !== "in_progress") throw new AppError("Attempt already submitted", 400);

    const quiz = await QuizModel.findById(attempt.quiz);
    if (!quiz) throw new AppError("Quiz not found", 404);

    // Time limit check
    if (quiz.timeLimitSec && quiz.timeLimitSec > 0) {
      const elapsed = (Date.now() - new Date(attempt.startedAt).getTime()) / 1000;
      if (elapsed > quiz.timeLimitSec + 30) {   // 30s grace
        attempt.status = "expired";
        await attempt.save();
        throw new AppError("Attempt expired", 400);
      }
    }

    // Grade
    let score = 0;
    let maxScore = 0;
    const gradedAnswers = (attempt.answers || []).map((a: any) => {
      const q = (quiz.questions as any).id(a.questionId);
      if (!q) return a;
      maxScore += q.points || 0;
      const given = answers.find((x) => String(x.questionId) === String(a.questionId));
      const result = gradeAnswer(q, given?.answer);
      score += result.pointsAwarded;
      return { questionId: a.questionId, answer: given?.answer, ...result };
    });

    const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
    attempt.answers = gradedAnswers;
    attempt.score = score;
    attempt.maxScore = maxScore;
    attempt.passed = percent >= quiz.passingScore;
    attempt.status = "graded";
    attempt.submittedAt = new Date();
    attempt.timeSpentSec = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
    await attempt.save();

    return {
      attemptId: attempt._id,
      score, maxScore, percent: Math.round(percent),
      passed: attempt.passed,
      showAnswers: quiz.showCorrectAnswers === "after_attempt"
        || (quiz.showCorrectAnswers === "after_pass" && attempt.passed),
    };
  },

  async getAttemptDetail(userId: string, attemptId: string) {
    const attempt = await QuizAttemptModel.findOne({ _id: attemptId, user: userId }).lean();
    if (!attempt) throw new AppError("Attempt not found", 404);
    const quiz = await QuizModel.findById(attempt.quiz).lean();
    if (!quiz) throw new AppError("Quiz not found", 404);

    const show = (quiz as any).showCorrectAnswers === "after_attempt"
      || ((quiz as any).showCorrectAnswers === "after_pass" && (attempt as any).passed);

    return {
      attempt: {
        ...attempt,
        answers: attempt.answers.map((a: any) => {
          const q = (quiz.questions as any).id(a.questionId);
          return {
            questionId: a.questionId,
            prompt: q?.prompt,
            type: q?.type,
            given: a.answer,
            isCorrect: a.isCorrect,
            pointsAwarded: a.pointsAwarded,
            pointsTotal: q?.points,
            explanation: show ? q?.explanation : undefined,
            correctText: show ? q?.correctText : undefined,
            correctOptionIds: show
              ? (q?.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.id)
              : undefined,
          };
        }),
      },
    };
  },
};