import { decryptSecret, encryptSecret } from "../security/encryption.service.js";
import { createSecret, getSecretByIdForOwner, listSecretsForOwner, searchSecretsForOwner } from "../repositories/secretRepo.js";
import { insertAuditLog } from "../repositories/auditRepo.js";

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

export async function createSecretHandler(req, res) {
  const { title, content } = req.body || {};
  if (!content) throw badRequest("content is required");
  const encryptedContent = encryptSecret(content);
  const row = await createSecret({ ownerId: req.user.id, title: title ?? "", encryptedContent });

  await insertAuditLog({ userId: req.user.id, action: "secrets.create", result: "success" });
  res.status(201).json({
    data: {
      id: row.id,
      title: row.title,
      created_at: row.created_at,
    },
  });
}

export async function listSecretsHandler(req, res) {
  const rows = await listSecretsForOwner(req.user.id);
  res.json({ data: rows });
}

export async function getSecretByIdHandler(req, res) {
  const secretId = Number(req.params.id);
  if (!Number.isFinite(secretId)) throw badRequest("invalid secret id");

  // IDOR-safe: returns 404 when the resource does not belong to authenticated user.
  const row = await getSecretByIdForOwner(secretId, req.user.id);
  if (!row) throw notFound("Secret not found");

  await insertAuditLog({ userId: req.user.id, action: "secrets.read", result: "success" });
  res.json({
    data: {
      id: row.id,
      title: row.title,
      content: decryptSecret(row.content),
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  });
}

export async function searchSecretsHandler(req, res) {
  const search = String(req.query.search ?? "").trim();
  if (!search) return res.json({ data: [] });

  const rows = await searchSecretsForOwner(req.user.id, search);
  const decrypted = rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: decryptSecret(row.content),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
  res.json({ data: decrypted });
}
