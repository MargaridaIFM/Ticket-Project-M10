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

async function auditAdmin(req, action, result) {
  await insertAuditLog({ userId: req.user.id, action, result }).catch(() => null);
}

export async function listUsersHandler(req, res) {
  try {
    const users = await listUsers();
    await auditAdmin(req, "admin.users.list", "success");
    res.json({ data: users });
  } catch (error) {
    await auditAdmin(req, "admin.users.list", "fail");
    throw error;
  }
}

export async function updateUserRoleHandler(req, res) {
  const role = String(req.body?.role || "").trim();
  const action = `admin.user.role.${role || "unknown"}`;
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) throw badRequest("Invalid user id");
    if (!["user", "admin", "viewer"].includes(role)) throw badRequest("Invalid role");

    const target = await getUserById(userId);
    if (!target) throw notFound("User not found");
    if (target.status === "deleted") throw notFound("User not found");

    if (target.id === req.user.id && role !== "admin") {
      throw badRequest("Admin cannot remove own admin role");
    }

    const updated = await updateUserRole(userId, role);
    await auditAdmin(req, action, "success");

    res.json({
      data: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (error) {
    await auditAdmin(req, action, "fail");
    throw error;
  }
}

export async function deleteUserHandler(req, res) {
  const action = "admin.user.delete";
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) throw badRequest("Invalid user id");
    if (userId === req.user.id) throw badRequest("Admin cannot delete own account");

    const target = await getUserById(userId);
    if (!target) throw notFound("User not found");
    if (target.status === "deleted") throw notFound("User not found");

    const removed = await archiveAndSoftDeleteUser(userId, req.user.id);
    if (!removed) throw notFound("User not found");
    await revokeRefreshTokensForUser(userId);

    await auditAdmin(req, action, "success");
    res.json({ data: { id: userId, message: "User removed" } });
  } catch (error) {
    await auditAdmin(req, action, "fail");
    throw error;
  }
}

export async function updateUserStatusHandler(req, res) {
  const status = String(req.body?.status || "").trim();
  const action = `admin.user.status.${status || "unknown"}`;
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) throw badRequest("Invalid user id");
    if (!["pending", "active", "blocked"].includes(status)) throw badRequest("Invalid status");

    const target = await getUserById(userId);
    if (!target) throw notFound("User not found");
    if (target.status === "deleted") throw notFound("User not found");

    if (target.id === req.user.id && status !== "active") {
      throw badRequest("Admin cannot block own account");
    }

    const updated = await updateUserStatus(userId, status);
    await auditAdmin(req, action, "success");

    res.json({
      data: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (error) {
    await auditAdmin(req, action, "fail");
    throw error;
  }
}
