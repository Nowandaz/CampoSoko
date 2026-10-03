import { audit, csvRow, requireAdmin } from "@/lib/admin";

export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const { me, sb } = await requireAdmin();
  let header: string[]; let rows: unknown[][];
  if (kind === "users") {
    const { data } = await sb.from("profiles").select("id, full_name, email, whatsapp, role, suspended, created_at, campuses(name)").order("created_at", { ascending: false }).limit(10000);
    header = ["id", "full_name", "email", "whatsapp", "campus", "role", "suspended", "joined"];
    rows = (data ?? []).map((u) => [u.id, u.full_name, u.email, u.whatsapp, (u.campuses as unknown as { name: string } | null)?.name, u.role, u.suspended, u.created_at]);
  } else if (kind === "listings") {
    const { data } = await sb.from("listings").select("id, title, type, price, status, featured, location, created_at, expires_at, profiles(email), campuses(name), categories(name)").order("created_at", { ascending: false }).limit(10000);
    header = ["id", "title", "type", "price_kes", "status", "featured", "campus", "category", "seller_email", "location", "created", "expires"];
    rows = (data ?? []).map((l) => [l.id, l.title, l.type, l.price, l.status, l.featured, (l.campuses as unknown as { name: string } | null)?.name, (l.categories as unknown as { name: string } | null)?.name, (l.profiles as unknown as { email: string } | null)?.email, l.location, l.created_at, l.expires_at]);
  } else {
    return new Response("Not found", { status: 404 });
  }
  await audit(sb, me.id, `export_${kind}`, "export", kind, { rows: rows.length });
  const body = "﻿" + [csvRow(header), ...rows.map(csvRow)].join("\r\n");
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="camposoko-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "private, no-store" } });
}
