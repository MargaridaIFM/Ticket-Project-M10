import { insertAuditLog } from "../repositories/auditRepo.js";
import { archiveAndSoftDeleteUser, getUserById, listUsers, updateUserRole, updateUserStatus } from "../repositories/userRepo.js";
import { revokeRefreshTokensForUser } from "../security/jwt.service.js";

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

export async function listUsersHandler(req, res) {
  const users = await listUsers();
  res.json({ data: users });
}

export async function updateUserRoleHandler(req, res) {
  const userId = Number(req.params.id);
  const role = String(req.body?.role || "").trim();
  if (!Number.isFinite(userId)) throw badRequest("Invalid user id");
  if (!["user", "admin", "viewer"].includes(role)) throw badRequest("Invalid role");

  const target = await getUserById(userId);
  if (!target) throw notFound("User not found");
  if (target.status === "deleted") throw notFound("User not found");

  if (target.id === req.user.id && role !== "admin") {
    throw badRequest("Admin cannot remove own admin role");
  }

  const updated = await updateUserRole(userId, role);
  await insertAuditLog({ userId: req.user.id, action: `admin.user.role.${role}`, result: "success" });

  res.json({
    data: {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      status: updated.status,
    },
  });
}

export async function deleteUserHandler(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) throw badRequest("Invalid user id");
  if (userId === req.user.id) throw badRequest("Admin cannot delete own account");

  const target = await getUserById(userId);
  if (!target) throw notFound("User not found");
  if (target.status === "deleted") throw notFound("User not found");

  const removed = await archiveAndSoftDeleteUser(userId, req.user.id);
  if (!removed) throw notFound("User not found");
  await revokeRefreshTokensForUser(userId);

  await insertAuditLog({ userId: req.user.id, action: "admin.user.delete", result: "success" });
  res.json({ data: { id: userId, message: "User removed" } });
}

export async function updateUserStatusHandler(req, res) {
  const userId = Number(req.params.id);
  const status = String(req.body?.status || "").trim();
  if (!Number.isFinite(userId)) throw badRequest("Invalid user id");
  if (!["pending", "active", "blocked"].includes(status)) throw badRequest("Invalid status");

  const target = await getUserById(userId);
  if (!target) throw notFound("User not found");
  if (target.status === "deleted") throw notFound("User not found");

  if (target.id === req.user.id && status !== "active") {
    throw badRequest("Admin cannot block own account");
  }

  const updated = await updateUserStatus(userId, status);
  await insertAuditLog({ userId: req.user.id, action: `admin.user.status.${status}`, result: "success" });

  res.json({
    data: {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      status: updated.status,
    },
  });
}
