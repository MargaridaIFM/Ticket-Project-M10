import { Router } from "express";
import { asyncHandler } from "../middlewares/errorMiddleware.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import * as secretController from "../controllers/secretController.js";

const router = Router();

router.use(requireAuth);
router.get("/", asyncHandler(secretController.listSecretsHandler));
router.get("/search", asyncHandler(secretController.searchSecretsHandler));
router.get("/:id", asyncHandler(secretController.getSecretByIdHandler));
router.post("/", asyncHandler(secretController.createSecretHandler));

export default router;
