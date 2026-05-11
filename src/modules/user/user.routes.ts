import express from "express";

import * as UserController from "./user.controller";

const router = express.Router();

// Admin routes
router.get("/", UserController.getUsers);

router.get("/:id", UserController.getSingleUser);

router.patch("/:id", UserController.updateUser);

router.delete("/:id", UserController.deleteUser);

export default router;
