import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// API keys are encrypted before they reach the database (AES-256-GCM). Set AI_KEYS_SECRET to a long random
// string; if it is missing the key is derived from the service-role key (rotate that key => re-enter AI keys).
const key = () => createHash("sha256").update(process.env.AI_KEYS_SECRET || `${process.env.SUPABASE_SERVICE_ROLE_KEY}:ai-keys`).digest();

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}

export function decrypt(b64: string) {
  const buf = Buffer.from(b64, "base64");
  const d = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

export const keyHint = (k: string) => (k.length > 10 ? `${k.slice(0, 4)}...${k.slice(-4)}` : "****");
