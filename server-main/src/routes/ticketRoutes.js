// server-main/src/routes/ticketRoutes.js
import { Router } from "express";
import { asyncHandler } from "../middlewares/errorMiddleware.js";
import { requireAnyRole, requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import * as ticketController from "../controllers/ticketController.js";

const router = Router();

router.use(requireAuth);
router.get("/", asyncHandler(ticketController.listTickets));
router.get("/:id", asyncHandler(ticketController.getTicket));
router.post("/", requireAnyRole(["user", "admin"]), asyncHandler(ticketController.createTicket));
router.patch("/:id", requireAnyRole(["user", "admin"]), asyncHandler(ticketController.patchTicket));
router.delete("/:id", requireRole("admin"), asyncHandler(ticketController.deleteTicket));

export default router;
