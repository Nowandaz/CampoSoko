import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Cron endpoints require "Authorization: Bearer <CRON_SECRET>" (Vercel Cron, GitHub Actions or cron-job.org). */
export function cronAuthorised(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return given.length === want.length && timingSafeEqual(Buffer.from(given), Buffer.from(want));
}
