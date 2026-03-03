import fs from "fs/promises";
import path from "path";
import { insertSystemLog } from "../repositories/auditRepo.js";

const LOG_FILE = process.env.APP_LOG_FILE || "data/app.log";

function maskEmail(text) {
  return text.replace(/([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, "$1***$2");
}

function maskSecrets(text) {
  return text
    .replace(/(\"?password\"?\s*[:=]\s*\")([^\"]+)(\")/gi, "$1***$3")
    .replace(/(\"?token\"?\s*[:=]\s*\")([^\"]+)(\")/gi, "$1***$3")
    .replace(/(Bearer\s+)([A-Za-z0-9\-._~+/]+=*)/gi, "$1***");
}

export function sanitizeLogValue(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return maskSecrets(maskEmail(text));
}

export async function secureLog(level, message) {
  const clean = sanitizeLogValue(message);
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${clean}\n`;
  const filePath = path.resolve(LOG_FILE);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, line, "utf8");
  await insertSystemLog({ level: level.toLowerCase(), message: clean }).catch(() => null);
}
