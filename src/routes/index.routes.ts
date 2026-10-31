import { Router } from "express";
import cronRoutes from "../modules/cron/cron.routes";

// ── Platform core ──────────────────────────────────────
import authRoutes from "./auth.routes";
import studentRoutes from "./student/studentProfile.routes";
import classroomRoutes from "./classroom.routes";
import experienceRoutes from "../modules/experience/experience.routes";
import userRoutes from "../modules/user/user.routes";
import formRoutes from "../modules/forms/form/form.routes";
import submissionRoutes from "../modules/forms/submission/submission.routes";
import automationRoutes from "../modules/forms/automation/automation.routes";
import bookingRoutes from "../modules/forms/booking/booking.routes";
import planRoutes from "../modules/plan/plan.routes";
import planFeatureRoutes from "../modules/planFeature/planFeature.routes";
import subscriptionRoutes from "../modules/subscription/subscription.routes";
import themeRoutes from "../modules/theme/theme.routes";
import themeCategoryRoutes from "../modules/theme/themeCategory/themeCategory.routes";
import pageTemplateRoutes from "../modules/theme/pageTemplate/pageTemplate.routes";
import modulePresetRoutes from "../modules/theme/modulePreset/modulePreset.routes";
import teacherProfileRoutes from "../modules/teacher/teacherProfile/teacherProfile.routes";

// ── Commerce ───────────────────────────────────────────
import cartRoutes from "../modules/cart/cart.routes";
import orderRoutes, { adminOrderRoutes } from "../modules/order/order.routes";
import couponRoutes, { couponValidationRouter } from "../modules/coupon/coupon.routes";
import entitlementRoutes, { adminEntitlementRoutes } from "../modules/entitlement/entitlement.routes";
// import webhookRoutes from "../modules/payments/webhook.routes";
import productRoutes, { adminProductRoutes } from "../modules/product/product.routes";
import affiliateRoutes, { adminAffiliateRoutes } from "../modules/affiliate/dashboard.routes";

// ── Course module ──────────────────────────────────────
import courseRoutes from "../modules/course/course.routes";
import learningRoutes from "../modules/course/learning/learning.routes";
import publicCourseRoutes from "../modules/course/publicCourse/publicCourse.routes";
import enrollmentRoutes from "../modules/course/enrollment/enrollment.routes";
import progressRoutes from "../modules/course/progress/progress.routes";
import quizRoutes, { quizAttemptRoutes } from "../modules/course/quiz/quiz.routes";
import certificateRoutes from "../modules/course/certificate/certificate.routes";
import reviewRoutes, {
  teacherReviewRoutes,
  adminReviewRoutes,
} from "../modules/course/review/review.routes";
import qaRoutes from "../modules/course/qa/qa.routes";
import analyticsRoutes from "../modules/course/analytics/analytics.routes";
import adminCourseRoutes from "../modules/course/adminCourse.routes";

// ── AI ─────────────────────────────────────────────────
import {
  courseAiRoutes,
  adminCourseAiRoutes,
} from "../modules/course/ai/ai.routes";

const router = Router();

const routes = [
  // ═══════════════════════════════════════════════════
  // Platform core
  // ═══════════════════════════════════════════════════
  { path: "/auth", route: authRoutes },
  { path: "/student", route: studentRoutes },
  { path: "/classrooms", route: classroomRoutes },
  { path: "/experiences", route: experienceRoutes },
  { path: "/users", route: userRoutes },
  { path: "/forms", route: formRoutes },
  { path: "/submissions", route: submissionRoutes },
  { path: "/automations", route: automationRoutes },
  { path: "/bookings", route: bookingRoutes },
  { path: "/plans", route: planRoutes },
  { path: "/plan-features", route: planFeatureRoutes },
  { path: "/subscriptions", route: subscriptionRoutes },
  { path: "/themes", route: themeRoutes },
  { path: "/theme-categories", route: themeCategoryRoutes },
  { path: "/page-templates", route: pageTemplateRoutes },
  { path: "/module-presets", route: modulePresetRoutes },
  { path: "/teacher-profile", route: teacherProfileRoutes },

  // ═══════════════════════════════════════════════════
  // Webhooks — MUST use raw-body middleware
  // ═══════════════════════════════════════════════════
  // { path: "/webhooks", route: webhookRoutes },

  // ═══════════════════════════════════════════════════
  // Public
  // ═══════════════════════════════════════════════════
  { path: "/public/courses", route: publicCourseRoutes },
  { path: "/coupons/validate", route: couponValidationRouter },
  { path: "/certificates", route: certificateRoutes },
  { path: "/reviews", route: reviewRoutes },
  { path: "/qa", route: qaRoutes },

  // ═══════════════════════════════════════════════════
  // Student / authenticated
  // ═══════════════════════════════════════════════════
  { path: "/learning", route: learningRoutes },
  { path: "/cart", route: cartRoutes },
  { path: "/orders", route: orderRoutes },
  { path: "/coupons", route: couponRoutes },
  { path: "/entitlements", route: entitlementRoutes },
  { path: "/enrollments", route: enrollmentRoutes },
  { path: "/progress", route: progressRoutes },
  { path: "/quizzes", route: quizRoutes },
  { path: "/attempts", route: quizAttemptRoutes },
  { path: "/affiliate", route: affiliateRoutes },

  // ═══════════════════════════════════════════════════
  // Teacher
  // ═══════════════════════════════════════════════════
  { path: "/teacher/courses", route: courseRoutes },
  { path: "/teacher/products", route: productRoutes },
  { path: "/teacher/reviews", route: teacherReviewRoutes },
  { path: "/teacher/analytics", route: analyticsRoutes },
  { path: "/course-ai", route: courseAiRoutes },              // ⭐ FIXED — was missing

  // ═══════════════════════════════════════════════════
  // Admin
  // ═══════════════════════════════════════════════════
  { path: "/admin/orders", route: adminOrderRoutes },
  { path: "/admin/entitlements", route: adminEntitlementRoutes },
  { path: "/admin/reviews", route: adminReviewRoutes },
  { path: "/admin/products", route: adminProductRoutes },
  { path: "/admin/affiliate", route: adminAffiliateRoutes },
  { path: "/admin/courses", route: adminCourseRoutes },
  { path: "/admin/cron", route: cronRoutes },
  { path: "/admin/course-ai", route: adminCourseAiRoutes },   // ⭐ correct admin AI
  // ⭐ REMOVED: { path: "/admin/ai", route: courseAiRoutes } — was wrong (duplicate of teacher routes)
];

routes.forEach((item) => {
  router.use(item.path, item.route);
});

export default router;