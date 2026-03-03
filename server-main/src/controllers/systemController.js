import { listSystemLogs } from "../repositories/auditRepo.js";

export async function getSystemLogs(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 500);
  const logs = await listSystemLogs(limit);
  res.json({ data: logs });
}
