import { getUserById } from "../repositories/userRepo.js";
import { isTokenVersionValid, verifyAccessToken } from "../security/jwt.service.js";

function unauthorized(message = "Unauthorized") {
  const err = new Error(message);
  err.statusCode = 401;
  return err;
}

function forbidden(message = "Forbidden") {
  const err = new Error(message);
  err.statusCode = 403;
  return err;
}

export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");
  if (!token) return next(unauthorized("Missing bearer token"));

  try {
    const decoded = verifyAccessToken(token);
    const user = await getUserById(decoded.sub);
    if (!user) return next(unauthorized("Invalid token user"));
    if (!isTokenVersionValid(decoded, user)) return next(unauthorized("Token version invalidated"));
    req.user = { id: user.id, username: user.username, role: user.role, tokenVersion: user.token_version };
    return next();
  } catch (err) {
    return next(unauthorized("Invalid or expired token"));
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized("Missing authentication context"));
    if (req.user.role !== role) return next(forbidden("Forbidden"));
    return next();
  };
}

export function requireAnyRole(roles) {
  const allowed = new Set(Array.isArray(roles) ? roles : [roles]);
  return (req, res, next) => {
    if (!req.user) return next(unauthorized("Missing authentication context"));
    if (!allowed.has(req.user.role)) return next(forbidden("Forbidden"));
    return next();
  };
}
