import { Router } from "express";

import authRoutes from "./auth.routes";
import studentRoutes from "./student/studentProfile.routes";
import classroomRoutes from "./classroom.routes";

import experienceRoutes from "../modules/experience/experience.routes";
import userRoutes from "../modules/user/user.routes";

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
];

routes.forEach((item) => {
  router.use(item.path, item.route);
});

export default router;
