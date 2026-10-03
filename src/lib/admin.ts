import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Defence in depth: the proxy gates /admin, RLS gates the data, and this gates every page and action. */
export async function requireAdmin() {
  const me = await getMe();
  if (!me || me.role !== "admin" || me.suspended) redirect("/");
  return { me, sb: await createClient() };
}

export async function audit(sb: SupabaseClient, adminId: string, action: string, targetType: string, targetId: string, details?: Record<string, unknown>) {
  await sb.from("admin_audit_log").insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, details: details ?? null });
}

/** CSV cell with quoting and spreadsheet-formula neutralising. */
export function csvCell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^\+\d[\d ]*$/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
export const csvRow = (cells: unknown[]) => cells.map(csvCell).join(",");

export const PAGE = 25;
export const likeSafe = (s: string) => s.replace(/[\\%_,()*"]/g, " ").trim();
