import { Router } from "express";
import { asyncHandler } from "../middlewares/errorMiddleware.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import * as adminController from "../controllers/adminController.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));
router.get("/users", asyncHandler(adminController.listUsersHandler));
router.patch("/users/:id/role", asyncHandler(adminController.updateUserRoleHandler));
router.patch("/users/:id/status", asyncHandler(adminController.updateUserStatusHandler));
router.delete("/users/:id", asyncHandler(adminController.deleteUserHandler));

export default router;
