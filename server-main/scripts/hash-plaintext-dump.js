#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcrypt";

async function main() {
  const input = process.argv[2];
  const output = process.argv[3] || "hashed-users.json";
  if (!input) {
    console.error("Usage: node scripts/hash-plaintext-dump.js <input.json> [output.json]");
    process.exit(1);
  }

  const inPath = path.resolve(input);
  const outPath = path.resolve(output);
  const raw = await fs.readFile(inPath, "utf8");
  const users = JSON.parse(raw);
  if (!Array.isArray(users)) throw new Error("Input JSON must be an array of users");

  const hashed = [];
  for (const user of users) {
    const plain = String(user.password ?? "");
    if (!plain) throw new Error(`User ${user.username || user.email || "unknown"} has empty password`);
    const password_hash = await bcrypt.hash(plain, 12);
    hashed.push({
      username: user.username,
      email: user.email,
      role: user.role || "user",
      password_hash,
    });
  }

  await fs.writeFile(outPath, JSON.stringify(hashed, null, 2));
  console.log(`Hashed ${hashed.length} users -> ${outPath}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
