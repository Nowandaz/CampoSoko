import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Light polling used by the bell: unread count plus anything new since the page loaded. */
export async function GET(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ count: 0, items: [] }, { status: 401 });
  const sinceRaw = new URL(req.url).searchParams.get("since") ?? "";
  const since = Number.isNaN(Date.parse(sinceRaw)) ? new Date().toISOString() : new Date(sinceRaw).toISOString();
  const [{ count }, { data }] = await Promise.all([
    sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
    sb.from("notifications").select("id, title, body, link, created_at").eq("user_id", user.id).is("read_at", null).gt("created_at", since).order("created_at", { ascending: true }).limit(3),
  ]);
  return NextResponse.json({ count: count ?? 0, items: data ?? [] }, { headers: { "cache-control": "no-store" } });
}
