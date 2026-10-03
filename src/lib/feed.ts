import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PAGE_SIZE = 24;
export type Tab = "goods" | "services" | "wanted";

const num = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(0).max(100_000_000).optional());
const schema = z.object({
  tab: z.enum(["goods", "services", "wanted"]).catch("goods"),
  q: z.string().trim().max(80).optional().catch(undefined),
  category: z.string().uuid().optional().catch(undefined),
  min: num.catch(undefined),
  max: num.catch(undefined),
  campus: z.string().optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});
export type FeedParams = z.infer<typeof schema> & { campusId?: string };

export function parseFeedParams(raw: Record<string, string | string[] | undefined>, myCampus?: string): FeedParams {
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const p = schema.parse(flat);
  const campusId = p.campus === "all" ? undefined : z.string().uuid().safeParse(p.campus).success ? p.campus : myCampus;
  return { ...p, campusId };
}

/** Escape characters that have meaning inside a PostgREST or() / ilike filter. */
const likeSafe = (s: string) => s.replace(/[\\%_,()*"]/g, " ").trim();

export type FeedItem = {
  id: string; title: string; price: number; location: string; created_at: string; featured: boolean;
  image: string | null; seller: string;
};
export type WantedItem = {
  id: string; title: string; budget: number | null; created_at: string; type: string; category: string; user: string;
};

export async function fetchListings(sb: SupabaseClient, p: FeedParams) {
  let q = sb.from("listings")
    .select("id, title, price, location, created_at, featured, seller_id, listing_images(url, position)", { count: "exact" })
    .eq("status", "active").gt("expires_at", new Date().toISOString())
    .eq("type", p.tab === "services" ? "service" : "goods");
  if (p.campusId) q = q.eq("campus_id", p.campusId);
  if (p.category) q = q.eq("category_id", p.category);
  if (p.min != null) q = q.gte("price", p.min);
  if (p.max != null) q = q.lte("price", p.max);
  const term = p.q ? likeSafe(p.q) : "";
  if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  const from = (p.page - 1) * PAGE_SIZE;
  const { data, count } = await q.order("featured", { ascending: false }).order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);

  const ids = [...new Set((data ?? []).map((l) => l.seller_id))];
  const { data: sellers } = ids.length ? await sb.from("public_profiles").select("id, shop_name, full_name").in("id", ids) : { data: [] };
  const name = new Map((sellers ?? []).map((s) => [s.id, s.shop_name ?? s.full_name]));
  const items: FeedItem[] = (data ?? []).map((l) => ({
    id: l.id, title: l.title, price: Number(l.price), location: l.location, created_at: l.created_at, featured: l.featured,
    image: [...(l.listing_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null,
    seller: name.get(l.seller_id) ?? "Seller",
  }));
  return { items, total: count ?? 0 };
}

export async function fetchWanted(sb: SupabaseClient, p: FeedParams) {
  let q = sb.from("wanted_ads")
    .select("id, title, budget, created_at, type, user_id, categories(name)", { count: "exact" })
    .eq("status", "active");
  if (p.campusId) q = q.eq("campus_id", p.campusId);
  if (p.category) q = q.eq("category_id", p.category);
  if (p.max != null) q = q.lte("budget", p.max);
  const term = p.q ? likeSafe(p.q) : "";
  if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  const from = (p.page - 1) * PAGE_SIZE;
  const { data, count } = await q.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
  const ids = [...new Set((data ?? []).map((w) => w.user_id))];
  const { data: users } = ids.length ? await sb.from("public_profiles").select("id, full_name").in("id", ids) : { data: [] };
  const name = new Map((users ?? []).map((u) => [u.id, u.full_name]));
  const items: WantedItem[] = (data ?? []).map((w) => ({
    id: w.id, title: w.title, budget: w.budget == null ? null : Number(w.budget), created_at: w.created_at, type: w.type,
    category: (w.categories as unknown as { name: string } | null)?.name ?? "", user: name.get(w.user_id) ?? "Student",
  }));
  return { items, total: count ?? 0 };
}
