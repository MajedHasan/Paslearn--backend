import { Router } from "express";

import authRoutes from "./auth.routes";
import studentRoutes from "./student/studentProfile.routes";
import classroomRoutes from "./classroom.routes";

// Experience, User, Form, and Submission routes
import experienceRoutes from "../modules/experience/experience.routes";
import userRoutes from "../modules/user/user.routes";
import formRoutes from "../modules/forms/form/form.routes";
import submissionRoutes from "../modules/forms/submission/submission.routes";

// Plan, Plan Feature, and Subscription routes
import planRoutes from "../modules/plan/plan.routes";
import planFeatureRoutes from "../modules/planFeature/planFeature.routes";
import subscriptionRoutes from "../modules/subscription/subscription.routes";

// Theme, Theme Category, Page Template, and Module Preset routes
import themeRoutes from "../modules/theme/theme.routes";
import themeCategoryRoutes from "../modules/theme/themeCategory/themeCategory.routes";
import pageTemplateRoutes from "../modules/theme/pageTemplate/pageTemplate.routes";
import modulePresetRoutes from "../modules/theme/modulePreset/modulePreset.routes";

// Teacher Profile routes
import teacherProfileRoutes from "../modules/teacher/teacherProfile/teacherProfile.routes";

const router = Router();

const routes = [
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/student",
    route: studentRoutes,
  },
  {
    path: "/classrooms",
    route: classroomRoutes,
  },
  {
    path: "/experiences",
    route: experienceRoutes,
  },
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/forms",
    route: formRoutes,
  },
  {
    path: "/submissions",
    route: submissionRoutes,
  },
  {
    path: "/plans",
    route: planRoutes,
  },
  {
    path: "/plan-features",
    route: planFeatureRoutes,
  },
  {
    path: "/subscriptions",
    route: subscriptionRoutes,
  },
  {
    path: "/themes",
    route: themeRoutes,
  },
  {
    path: "/theme-categories",
    route: themeCategoryRoutes,
  },
  {
    path: "/page-templates",
    route: pageTemplateRoutes,
  },
  {
    path: "/module-presets",
    route: modulePresetRoutes,
  }
  // Teacher Profile routes
  , {
    path: "/teacher-profile",
    route: teacherProfileRoutes,
  }
];

routes.forEach((item) => {
  router.use(item.path, item.route);
});

export default router;
