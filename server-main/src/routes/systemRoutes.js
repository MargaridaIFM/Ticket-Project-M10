import { Router } from "express";
import { asyncHandler } from "../middlewares/errorMiddleware.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import { getSystemLogs } from "../controllers/systemController.js";

const router = Router();

router.get("/logs", requireAuth, requireRole("admin"), asyncHandler(getSystemLogs));

export default router;
