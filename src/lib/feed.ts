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


/** Public display names for a set of user ids (shop name, else public name). Tolerates an older DB view. */
async function publicNames(sb: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  type Row = { id: string; shop_name: string | null; public_name?: string | null };
  let rows: Row[] | null = null;
  const full = await sb.from("public_profiles").select("id, shop_name, public_name").in("id", ids);
  if (!full.error) rows = full.data as Row[];
  else rows = (await sb.from("public_profiles").select("id, shop_name").in("id", ids)).data as Row[] | null;
  return new Map((rows ?? []).map((x) => [x.id, x.shop_name ?? x.public_name ?? ""]));
}

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
  const name = await publicNames(sb, ids);
  const items: FeedItem[] = (data ?? []).map((l) => ({
    id: l.id, title: l.title, price: Number(l.price), location: l.location, created_at: l.created_at, featured: l.featured,
    image: [...(l.listing_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null,
    seller: name.get(l.seller_id) || "Seller",
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
  const name = await publicNames(sb, ids);
  const items: WantedItem[] = (data ?? []).map((w) => ({
    id: w.id, title: w.title, budget: w.budget == null ? null : Number(w.budget), created_at: w.created_at, type: w.type,
    category: (w.categories as unknown as { name: string } | null)?.name ?? "", user: name.get(w.user_id) || "Student",
  }));
  return { items, total: count ?? 0 };
}

/** Current active listings that already satisfy a wanted ad (same campus + type; same category or a keyword hit). */
export async function findMatchingListings(
  sb: SupabaseClient,
  w: { user_id: string; campus_id: string; type: string; category_id: string; keywords: string[] },
  limit = 6,
) {
  const clauses = [`category_id.eq.${w.category_id}`];
  for (const k of w.keywords.slice(0, 10)) {
    const t = likeSafe(k);
    if (t.length > 1) clauses.push(`title.ilike.%${t}%`, `description.ilike.%${t}%`);
  }
  const { data } = await sb.from("listings")
    .select("id, title, price, location, created_at, featured, seller_id, listing_images(url, position)")
    .eq("status", "active").gt("expires_at", new Date().toISOString())
    .eq("campus_id", w.campus_id).eq("type", w.type).neq("seller_id", w.user_id)
    .or(clauses.join(",")).order("created_at", { ascending: false }).limit(limit);
  const ids = [...new Set((data ?? []).map((l) => l.seller_id))];
  const name = await publicNames(sb, ids);
  return (data ?? []).map((l): FeedItem => ({
    id: l.id, title: l.title, price: Number(l.price), location: l.location, created_at: l.created_at, featured: l.featured,
    image: [...(l.listing_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null,
    seller: name.get(l.seller_id) || "Seller",
  }));
}

export type Cat = { id: string; name: string; slug: string; applies_to: string };

/** Browse mode: newest items per category (up to `per` each), plus a "just listed" row. */
export async function fetchCategoryRows(sb: SupabaseClient, p: FeedParams, cats: Cat[], per = 10) {
  const type = p.tab === "services" ? "service" : "goods";
  const relevant = cats.filter((c) => c.applies_to === "both" || c.applies_to === type);
  const base = () => {
    let q = sb.from("listings")
      .select("id, title, price, location, created_at, featured, seller_id, category_id, listing_images(url, position)")
      .eq("status", "active").gt("expires_at", new Date().toISOString()).eq("type", type);
    if (p.campusId) q = q.eq("campus_id", p.campusId);
    return q;
  };
  const [latest, ...perCat] = await Promise.all([
    base().order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(12),
    ...relevant.map((c) => base().eq("category_id", c.id).order("created_at", { ascending: false }).limit(per)),
  ]);
  const all = [...(latest.data ?? []), ...perCat.flatMap((r) => r.data ?? [])];
  const ids = [...new Set(all.map((l) => l.seller_id))];
  const name = await publicNames(sb, ids);
  const toItem = (l: (typeof all)[number]): FeedItem => ({
    id: l.id, title: l.title, price: Number(l.price), location: l.location, created_at: l.created_at, featured: l.featured,
    image: [...(l.listing_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null,
    seller: name.get(l.seller_id) || "Seller",
  });
  return {
    latest: (latest.data ?? []).map(toItem),
    rows: relevant.map((c, i) => ({ cat: c, items: (perCat[i].data ?? []).map(toItem) })).filter((r) => r.items.length),
  };
}

export async function fetchWantedRows(sb: SupabaseClient, p: FeedParams) {
  const { items } = await fetchWanted(sb, { ...p, page: 1 });
  const byCat = new Map<string, WantedItem[]>();
  for (const w of items) byCat.set(w.category, [...(byCat.get(w.category) ?? []), w]);
  return { latest: items.slice(0, 12), rows: [...byCat.entries()].map(([name, list]) => ({ name, items: list })).filter((r) => r.items.length > 1) };
}
