import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AiSettings = {
  ai_enabled: boolean; daily_cap: number; run_cap: number; auto_hide: boolean;
  ai_search: boolean; ai_shop_helper: boolean; notify_photo_reviews: boolean;
};
export const DEFAULTS: AiSettings = { ai_enabled: true, daily_cap: 300, run_cap: 30, auto_hide: false, ai_search: true, ai_shop_helper: true, notify_photo_reviews: true };

export async function getSettings(): Promise<AiSettings> {
  try {
    const { data } = await createAdminClient().from("app_settings").select("value").eq("key", "ai").maybeSingle();
    return { ...DEFAULTS, ...((data?.value as Partial<AiSettings>) ?? {}) };
  } catch {
    return DEFAULTS;
  }
}

export async function saveSettings(s: AiSettings) {
  await createAdminClient().from("app_settings").upsert({ key: "ai", value: s, updated_at: new Date().toISOString() });
}
