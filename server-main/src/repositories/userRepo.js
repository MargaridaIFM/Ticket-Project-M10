import { dbAll, dbGet, dbRun } from "../db/index.js";

export async function createUser({ username, email, passwordHash, role = "user", status = "active" }) {
  const result = await dbRun(
    `
    INSERT INTO users (username, email, password_hash, role, status, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    `,
    [username, email, passwordHash, role, status],
  );
  return getUserById(result.lastID);
}

export function getUserByUsername(username) {
  return dbGet("SELECT * FROM users WHERE username = ?", [username]);
}

export function getUserByEmail(email) {
  return dbGet("SELECT * FROM users WHERE email = ?", [email]);
}

export function getUserById(id) {
  return dbGet("SELECT * FROM users WHERE id = ?", [id]);
}

export async function bumpTokenVersion(userId) {
  await dbRun(
    "UPDATE users SET token_version = token_version + 1, updated_at = datetime('now') WHERE id = ?",
    [userId],
  );
}

export async function listUsers() {
  return dbAll(
    "SELECT id, username, email, role, status, created_at, updated_at FROM users WHERE status <> 'deleted' ORDER BY id ASC",
  );
}

export async function updateUserRole(userId, role) {
  await dbRun("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?", [role, userId]);
  return getUserById(userId);
}

export async function updateUserStatus(userId, status) {
  await dbRun("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, userId]);
  return getUserById(userId);
}

export async function deleteUserById(userId) {
  const result = await dbRun("DELETE FROM users WHERE id = ?", [userId]);
  return result.changes > 0;
}

export async function archiveAndSoftDeleteUser(userId, deletedByUserId) {
  const user = await getUserById(userId);
  if (!user || user.status === "deleted") return false;

  const stamp = Date.now();
  const tombstone = `deleted_${user.id}_${stamp}`;

  await dbRun(
    `
    INSERT OR REPLACE INTO deleted_users
      (original_user_id, username, email, role, status, deleted_by, deleted_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    [user.id, user.username, user.email, user.role, user.status, deletedByUserId],
  );

  await dbRun(
    `
    UPDATE users
    SET username = ?,
        email = ?,
        password_hash = ?,
        role = 'viewer',
        status = 'deleted',
        token_version = token_version + 1,
        updated_at = datetime('now')
    WHERE id = ?
    `,
    [tombstone, `${tombstone}@deleted.local`, tombstone, user.id],
  );

  return true;
}
