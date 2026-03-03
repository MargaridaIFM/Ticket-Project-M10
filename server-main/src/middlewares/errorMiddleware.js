import { secureLog } from "../services/logger.service.js";

// server-main/src/middlewares/errorMiddleware.js
export function asyncHandler(fn) {
  return function asyncWrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundMiddleware(req, res) {
  res.status(404).json({
    error: { message: "Route not found" },
  });
}

export function errorMiddleware(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";
  const route = `${req.method} ${req.originalUrl}`;
  const actor = req.user?.id ? ` userId=${req.user.id} role=${req.user.role}` : "";

  if (status >= 500) {
    secureLog("error", `${route} status=${status}${actor} message=${message}`).catch(() => null);
  } else {
    secureLog("warn", `${route} status=${status}${actor} message=${message}`).catch(() => null);
  }

  res.status(status).json({
    error: { message },
  });
}
