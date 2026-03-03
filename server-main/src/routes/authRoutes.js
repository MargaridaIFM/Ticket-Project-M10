import { Router } from "express";
import { asyncHandler } from "../middlewares/errorMiddleware.js";
import { loginRateLimiter } from "../middlewares/loginRateLimiter.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import * as authController from "../controllers/authController.js";

const router = Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", loginRateLimiter, asyncHandler(authController.login));
router.get("/me", requireAuth, asyncHandler(authController.me));
router.post("/refresh", asyncHandler(authController.refresh));
router.post("/logout", asyncHandler(authController.logout));
router.post("/change-password", requireAuth, asyncHandler(authController.changePassword));

export default router;
