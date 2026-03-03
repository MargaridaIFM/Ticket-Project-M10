import rateLimit from "express-rate-limit";
import { secureLog } from "../services/logger.service.js";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: async (req, res) => {
    await secureLog("warn", `Blocked IP after failed logins: ip=${req.ip}`);
    res.status(429).json({
      error: { message: "Too many failed login attempts. Try again in 15 minutes." },
    });
  },
});
