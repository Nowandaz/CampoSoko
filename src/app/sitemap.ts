import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/config/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = await createClient();
  const { data } = await sb.from("listings").select("id, created_at").eq("status", "active").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1000);
  return [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/shops`, changeFrequency: "daily", priority: 0.6 },
    ...(data ?? []).map((l) => ({ url: `${SITE_URL}/listing/${l.id}`, lastModified: l.created_at, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
