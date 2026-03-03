import { dbAll, dbRun } from "../db/index.js";

export function insertAuditLog({ userId, action, result }) {
  return dbRun(
    "INSERT INTO audit_log (user_id, action, result) VALUES (?, ?, ?)",
    [userId, action, result],
  );
}

export function insertSystemLog({ level, message }) {
  return dbRun("INSERT INTO system_logs (level, message) VALUES (?, ?)", [level, message]);
}

export function listSystemLogs(limit = 100) {
  return dbAll("SELECT * FROM system_logs ORDER BY id DESC LIMIT ?", [limit]);
}
