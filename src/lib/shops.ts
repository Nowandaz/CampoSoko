import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Shop = {
  user_id: string; shop_name: string; location: string; description: string; avatar_url: string | null; tags: string[];
  campus_id: string; listing_count?: number; up: number; down: number; total?: number; member_since?: string;
};
const norm = (r: Record<string, unknown>): Shop => ({
  ...(r as unknown as Shop), tags: (r.tags as string[]) ?? [], up: Number(r.up ?? 0), down: Number(r.down ?? 0),
  listing_count: r.listing_count == null ? undefined : Number(r.listing_count), total: r.total == null ? undefined : Number(r.total),
});

export async function shopDirectory(sb: SupabaseClient, o: { campus?: string; q?: string; limit?: number; offset?: number }) {
  const { data, error } = await sb.rpc("shop_directory", { p_campus: o.campus ?? null, p_q: o.q ?? "", p_limit: o.limit ?? 24, p_offset: o.offset ?? 0 });
  if (error) return { shops: [] as Shop[], total: 0 };
  const shops: Shop[] = (data ?? []).map(norm);
  return { shops, total: shops[0]?.total ?? 0 };
}

export async function getShop(sb: SupabaseClient, id: string) {
  const { data } = await sb.rpc("get_shop", { p_user: id });
  const r = Array.isArray(data) ? data[0] : data;
  return r ? norm(r) : null;
}

export async function shopReviews(sb: SupabaseClient, id: string, limit = 8) {
  const { data } = await sb.rpc("shop_reviews", { p_seller: id, p_limit: limit });
  return (data ?? []) as { positive: boolean; comment: string | null; created_at: string; buyer: string }[];
}
