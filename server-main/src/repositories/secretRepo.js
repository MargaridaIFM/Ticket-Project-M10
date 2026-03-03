import { dbAll, dbGet, dbRun } from "../db/index.js";

export async function createSecret({ ownerId, title, encryptedContent }) {
  const result = await dbRun(
    `
    INSERT INTO secrets (owner_id, title, content, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    `,
    [ownerId, title ?? "", encryptedContent],
  );
  return getSecretById(result.lastID);
}

export function getSecretById(id) {
  return dbGet("SELECT * FROM secrets WHERE id = ?", [id]);
}

export function getSecretByIdForOwner(id, ownerId) {
  return dbGet("SELECT * FROM secrets WHERE id = ? AND owner_id = ?", [id, ownerId]);
}

export function listSecretsForOwner(ownerId) {
  return dbAll(
    "SELECT id, owner_id, title, created_at, updated_at FROM secrets WHERE owner_id = ? ORDER BY id DESC",
    [ownerId],
  );
}

// Intentionally vulnerable example for SQLi lab (do not use in production):
// SELECT * FROM secrets WHERE owner_id = ${ownerId} AND content LIKE '%${search}%'
export function searchSecretsForOwner(ownerId, search) {
  return dbAll(
    "SELECT * FROM secrets WHERE owner_id = ? AND content LIKE ? ORDER BY id DESC",
    [ownerId, `%${search}%`],
  );
}
