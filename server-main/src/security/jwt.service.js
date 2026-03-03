import crypto from "crypto";
import jwt from "jsonwebtoken";
import { dbGet, dbRun } from "../db/index.js";

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "5m";
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 7);
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env";

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role, ver: user.token_version },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function issueRefreshToken(userId) {
  const raw = crypto.randomBytes(48).toString("hex");
  const tokenHash = sha256(raw);
  const expiresAtDate = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
  const expiresAt = expiresAtDate.toISOString();

  await dbRun(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [userId, tokenHash, expiresAt],
  );
  return { raw, expiresAt };
}

export async function consumeRefreshToken(rawToken) {
  const tokenHash = sha256(rawToken);
  const row = await dbGet(
    `
    SELECT rt.*, u.username, u.role, u.token_version
    FROM refresh_tokens rt
    JOIN users u ON u.id = rt.user_id
    WHERE rt.token_hash = ?
    `,
    [tokenHash],
  );

  if (!row) return null;
  if (row.revoked_at) return null;
  if (Date.parse(row.expires_at) <= Date.now()) return null;

  await dbRun("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE id = ?", [row.id]);
  return row;
}

export async function revokeRefreshTokensForUser(userId) {
  await dbRun(
    "UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL",
    [userId],
  );
}

export function accessTokenCookieMaxAgeMs() {
  return 5 * 60 * 1000;
}

export function refreshCookieMaxAgeMs() {
  return REFRESH_DAYS * 24 * 60 * 60 * 1000;
}

export function isTokenVersionValid(decodedToken, userRow) {
  return Number(decodedToken.ver) === Number(userRow.token_version);
}

export function accessTokenIssuedAt() {
  return nowUnix();
}
