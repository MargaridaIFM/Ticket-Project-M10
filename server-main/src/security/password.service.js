import bcrypt from "bcrypt";

const COST_FACTOR = Number(process.env.BCRYPT_COST || 12);

export async function hashPassword(plainPassword) {
  return bcrypt.hash(String(plainPassword), COST_FACTOR);
}

export async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(String(plainPassword), String(passwordHash));
}
