"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const studentProfile_routes_1 = __importDefault(require("./student/studentProfile.routes"));
const classroom_routes_1 = __importDefault(require("./classroom.routes"));
// Experience, User, Form, and Submission routes
const experience_routes_1 = __importDefault(require("../modules/experience/experience.routes"));
const user_routes_1 = __importDefault(require("../modules/user/user.routes"));
const form_routes_1 = __importDefault(require("../modules/forms/form/form.routes"));
const submission_routes_1 = __importDefault(require("../modules/forms/submission/submission.routes"));
// Plan, Plan Feature, and Subscription routes
const plan_routes_1 = __importDefault(require("../modules/plan/plan.routes"));
const planFeature_routes_1 = __importDefault(require("../modules/planFeature/planFeature.routes"));
const subscription_routes_1 = __importDefault(require("../modules/subscription/subscription.routes"));
const automation_routes_1 = __importDefault(require("../modules/forms/automation/automation.routes"));
const booking_routes_1 = __importDefault(require("../modules/forms/booking/booking.routes"));
// Theme, Theme Category, Page Template, and Module Preset routes
const theme_routes_1 = __importDefault(require("../modules/theme/theme.routes"));
const themeCategory_routes_1 = __importDefault(require("../modules/theme/themeCategory/themeCategory.routes"));
const pageTemplate_routes_1 = __importDefault(require("../modules/theme/pageTemplate/pageTemplate.routes"));
const modulePreset_routes_1 = __importDefault(require("../modules/theme/modulePreset/modulePreset.routes"));
// Teacher Profile routes
const teacherProfile_routes_1 = __importDefault(require("../modules/teacher/teacherProfile/teacherProfile.routes"));
const router = (0, express_1.Router)();
const routes = [
    {
        path: "/auth",
        route: auth_routes_1.default,
    },
    {
        path: "/student",
        route: studentProfile_routes_1.default,
    },
    {
        path: "/classrooms",
        route: classroom_routes_1.default,
    },
    {
        path: "/experiences",
        route: experience_routes_1.default,
    },
    {
        path: "/users",
        route: user_routes_1.default,
    },
    {
        path: "/forms",
        route: form_routes_1.default,
    },
    {
        path: "/submissions",
        route: submission_routes_1.default,
    },
    {
        path: "/automations",
        route: automation_routes_1.default,
    },
    {
        path: "/bookings",
        route: booking_routes_1.default,
    },
    {
        path: "/plans",
        route: plan_routes_1.default,
    },
    {
        path: "/plan-features",
        route: planFeature_routes_1.default,
    },
    {
        path: "/subscriptions",
        route: subscription_routes_1.default,
    },
    {
        path: "/themes",
        route: theme_routes_1.default,
    },
    {
        path: "/theme-categories",
        route: themeCategory_routes_1.default,
    },
    {
        path: "/page-templates",
        route: pageTemplate_routes_1.default,
    },
    {
        path: "/module-presets",
        route: modulePreset_routes_1.default,
    }
    // Teacher Profile routes
    ,
    {
        path: "/teacher-profile",
        route: teacherProfile_routes_1.default,
    }
];
routes.forEach((item) => {
    router.use(item.path, item.route);
});
exports.default = router;
