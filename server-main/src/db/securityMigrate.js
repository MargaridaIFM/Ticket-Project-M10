import { dbAll, dbExec, dbRun } from "./index.js";

async function tableColumns(tableName) {
  const rows = await dbAll(`PRAGMA table_info(${tableName})`);
  return new Set(rows.map((row) => row.name));
}

async function addColumnIfMissing(tableName, columnName, columnSql) {
  const cols = await tableColumns(tableName);
  if (cols.has(columnName)) return;
  await dbRun(`ALTER TABLE ${tableName} ADD COLUMN ${columnSql}`);
}

export async function ensureSecuritySchema() {
  await dbExec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active',
      token_version INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deleted_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_user_id INTEGER NOT NULL UNIQUE,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      deleted_by INTEGER NOT NULL,
      deleted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      revoked_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS secrets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      result TEXT NOT NULL CHECK (result IN ('success', 'fail')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TRIGGER IF NOT EXISTS audit_log_no_update
    BEFORE UPDATE ON audit_log
    BEGIN
      SELECT RAISE(ABORT, 'audit_log is immutable');
    END;

    CREATE TRIGGER IF NOT EXISTS audit_log_no_delete
    BEFORE DELETE ON audit_log
    BEGIN
      SELECT RAISE(ABORT, 'audit_log is immutable');
    END;

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_secrets_owner_id ON secrets(owner_id);
    CREATE INDEX IF NOT EXISTS idx_deleted_users_original_user_id ON deleted_users(original_user_id);
  `);

  await addColumnIfMissing("users", "role", "role TEXT NOT NULL DEFAULT 'user'");
  await addColumnIfMissing("users", "status", "status TEXT NOT NULL DEFAULT 'active'");
  await addColumnIfMissing("users", "token_version", "token_version INTEGER NOT NULL DEFAULT 0");
  await dbRun("UPDATE users SET status = 'active' WHERE status IS NULL OR TRIM(status) = ''");
}
