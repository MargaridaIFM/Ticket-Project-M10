import crypto from "crypto";
import { insertAuditLog } from "../repositories/auditRepo.js";
import { getUserByUsername, getUserByEmail, createUser, getUserById, bumpTokenVersion } from "../repositories/userRepo.js";
import { consumeRefreshToken, issueRefreshToken, refreshCookieMaxAgeMs, revokeRefreshTokensForUser, signAccessToken } from "../security/jwt.service.js";
import { hashPassword, verifyPassword } from "../security/password.service.js";
import { secureLog } from "../services/logger.service.js";
import { dbRun } from "../db/index.js";

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function unauthorized(message) {
  const err = new Error(message || "Unauthorized");
  err.statusCode = 401;
  return err;
}

function refreshCookie(token) {
  return {
    name: "refresh_token",
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: refreshCookieMaxAgeMs(),
      path: "/auth",
    },
  };
}

export async function register(req, res) {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) throw badRequest("username, email and password are required");
  if (String(password).length < 8) throw badRequest("password must have at least 8 chars");

  const existing = await getUserByUsername(String(username));
  if (existing) throw badRequest("username already exists");
  const emailInUse = await getUserByEmail(String(email).trim().toLowerCase());
  if (emailInUse) throw badRequest("email already exists");

  const passwordHash = await hashPassword(password);
  const user = await createUser({
    username: String(username).trim(),
    email: String(email).trim().toLowerCase(),
    passwordHash,
    role: "user",
    status: "pending",
  });

  await insertAuditLog({ userId: user.id, action: "auth.register", result: "success" });
  await secureLog("info", `User registered: username=${user.username} email=${user.email}`);

  res.status(201).json({
    data: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
}

export async function login(req, res) {
  const ip = req.ip;
  const { username, password } = req.body || {};
  if (!username || !password) throw badRequest("username and password are required");

  const user = await getUserByUsername(String(username));
  if (!user) {
    await secureLog("warn", `Login fail: username=${username} ip=${ip}`);
    throw unauthorized("Invalid credentials");
  }

  if (user.status !== "active") {
    await secureLog("warn", `Login blocked (status=${user.status}): username=${username} ip=${ip}`);
    const statusMessage = {
      pending: "Conta pendente de aprovação por admin",
      blocked: "Conta bloqueada por admin",
      deleted: "Conta removida",
    };
    throw unauthorized(statusMessage[user.status] || "Conta inativa");
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    await insertAuditLog({ userId: user.id, action: "auth.login", result: "fail" });
    await secureLog("warn", `Login fail: username=${username} ip=${ip}`);
    throw unauthorized("Invalid credentials");
  }

  const accessToken = signAccessToken(user);
  const refresh = await issueRefreshToken(user.id);
  const cookie = refreshCookie(refresh.raw);
  res.cookie(cookie.name, cookie.value, cookie.options);

  await insertAuditLog({ userId: user.id, action: "auth.login", result: "success" });
  await secureLog("info", `Login success: username=${username} ip=${ip}`);

  res.json({
    data: {
      accessToken,
      tokenType: "Bearer",
      expiresIn: "5m",
      user: { id: user.id, username: user.username, role: user.role },
    },
  });
}

export async function me(req, res) {
  const user = await getUserById(req.user.id);
  if (!user) throw unauthorized("Invalid user");
  res.json({
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });
}

export async function refresh(req, res) {
  const raw = req.cookies?.refresh_token;
  if (!raw) throw unauthorized("Missing refresh token");

  const tokenRow = await consumeRefreshToken(raw);
  if (!tokenRow) throw unauthorized("Invalid refresh token");

  const user = await getUserById(tokenRow.user_id);
  if (!user) throw unauthorized("Invalid refresh token user");

  const accessToken = signAccessToken(user);
  const nextRefresh = await issueRefreshToken(user.id);
  const cookie = refreshCookie(nextRefresh.raw);
  res.cookie(cookie.name, cookie.value, cookie.options);

  res.json({
    data: {
      accessToken,
      tokenType: "Bearer",
      expiresIn: "5m",
    },
  });
}

export async function logout(req, res) {
  const raw = req.cookies?.refresh_token;
  if (raw) {
    await consumeRefreshToken(raw).catch(() => null);
  }
  res.clearCookie("refresh_token", { path: "/auth" });
  res.json({ data: { message: "Logged out" } });
}

export async function changePassword(req, res) {
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8) throw badRequest("newPassword must have at least 8 chars");

  const passwordHash = await hashPassword(newPassword);
  await bumpTokenVersion(req.user.id);
  await revokeRefreshTokensForUser(req.user.id);

  // Update hash directly to avoid exposing it from generic update function
  const userIdHash = crypto.createHash("sha256").update(passwordHash).digest("hex");
  await secureLog("info", `Password changed for user id=${req.user.id} hashRef=${userIdHash.slice(0, 12)}`);

  await dbRun("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", [passwordHash, req.user.id]);

  await insertAuditLog({ userId: req.user.id, action: "auth.change_password", result: "success" });

  res.json({ data: { message: "Password changed, tokens invalidated" } });
}
