"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, keyHint } from "@/lib/ai/crypto";
import { callProvider, loadProviders } from "@/lib/ai/client";
import { DEFAULTS, saveSettings } from "@/lib/ai/settings";
import { inferDefaults } from "@/lib/ai/client-pure";
import { runAndRecord } from "@/lib/ai/pipeline";
import { cleanText, firstError } from "@/lib/validation";

export type AiState = { error?: string; notice?: string; results?: { name: string; ok: boolean; ms: number; detail: string }[] };

const endpoint = z.string().trim().max(300).optional().transform((v) => v || null).refine((v) => {
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || (u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname));
  } catch { return false; }
}, "Endpoint must be a full https:// URL (base URL only)");

const providerSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().transform(cleanText).pipe(z.string().min(1, "Give the provider a name").max(60)),
  type: z.enum(["openai", "gemini", "anthropic"]),
  api_key: z.string().trim().max(400).optional(),
  endpoint,
  model: z.string().trim().max(120).optional().transform((v) => v || null),
  weight: z.coerce.number().int().min(1).max(100),
});

export async function saveProvider(_: AiState, fd: FormData): Promise<AiState> {
  const { me, sb } = await requireAdmin();
  const p = providerSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const { id, api_key, ...rest } = p.data;
  const admin = createAdminClient();
  const row: Record<string, unknown> = { ...rest };
  if (api_key) {
    // Keys paste badly sometimes: strip spaces, quotes and a leading "Bearer ".
    const key = api_key.replace(/^bearer\s+/i, "").replace(/["'\s]/g, "");
    if (key.length < 12) return { error: "That API key looks too short. Copy the whole key." };
    row.api_key_enc = encrypt(key); row.key_hint = keyHint(key);
    // An OpenRouter or Groq key with no endpoint set gets the right address filled in.
    Object.assign(row, inferDefaults(rest.type, key, rest.endpoint, rest.model));
  }
  if (id) {
    const { error } = await admin.from("ai_providers").update(row).eq("id", id);
    if (error) return { error: "Could not update the provider" };
  } else {
    if (!api_key) return { error: "Paste the API key" };
    const { error } = await admin.from("ai_providers").insert(row);
    if (error) return { error: /relation|schema cache/i.test(error.message) ? "Run supabase/run-in-order/12-ai-and-review.sql first" : "Could not add the provider" };
  }
  await audit(sb, me.id, id ? "edit_ai_provider" : "add_ai_provider", "ai_provider", id || "new", { name: rest.name, type: rest.type });
  revalidatePath("/admin/ai");
  return { notice: "Saved" };
}

export async function toggleProvider(fd: FormData) {
  const { me, sb } = await requireAdmin();
  const id = z.string().uuid().parse(fd.get("id"));
  const active = fd.get("active") === "true";
  await createAdminClient().from("ai_providers").update({ active }).eq("id", id);
  await audit(sb, me.id, active ? "enable_ai_provider" : "disable_ai_provider", "ai_provider", id);
  revalidatePath("/admin/ai");
}

export async function deleteProvider(fd: FormData) {
  const { me, sb } = await requireAdmin();
  const id = z.string().uuid().parse(fd.get("id"));
  await createAdminClient().from("ai_providers").delete().eq("id", id);
  await audit(sb, me.id, "delete_ai_provider", "ai_provider", id);
  revalidatePath("/admin/ai");
}

/** Sends a tiny prompt to every provider (including disabled ones) and reports success and speed. */
export async function testProviders(): Promise<AiState> {
  await requireAdmin();
  const providers = await loadProviders(false);
  if (!providers.length) return { error: "No providers to test. Add one first." };
  const results = await Promise.all(providers.map(async (p) => {
    const t0 = Date.now();
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25_000);
    try {
      const out = await callProvider(p, "Reply with the single word OK.", "Say OK.", 1024, ctl.signal);
      return { name: p.name, ok: out.trim().length > 0, ms: Date.now() - t0, detail: `replied "${out.trim().slice(0, 40)}"` };
    } catch (e) {
      return { name: p.name, ok: false, ms: Date.now() - t0, detail: e instanceof Error ? e.message.slice(0, 100) : "failed" };
    } finally { clearTimeout(timer); }
  }));
  return { results };
}

const settingsSchema = z.object({
  daily_cap: z.coerce.number().int().min(10).max(100000),
  run_cap: z.coerce.number().int().min(1).max(200),
});

export async function saveAiSettings(_: AiState, fd: FormData): Promise<AiState> {
  const { me, sb } = await requireAdmin();
  const n = settingsSchema.safeParse(Object.fromEntries(fd));
  if (!n.success) return { error: firstError(n.error) };
  const flag = (k: string) => fd.get(k) === "on";
  await saveSettings({
    ...DEFAULTS, ...n.data,
    ai_enabled: flag("ai_enabled"), auto_hide: flag("auto_hide"), ai_search: flag("ai_search"),
    ai_shop_helper: flag("ai_shop_helper"), notify_photo_reviews: flag("notify_photo_reviews"), check_on_post: flag("check_on_post"),
  });
  await audit(sb, me.id, "save_ai_settings", "settings", "ai");
  revalidatePath("/admin/ai");
  return { notice: "Settings saved" };
}

export async function runAiNow(): Promise<AiState> {
  const { me, sb } = await requireAdmin();
  const { stats, error } = await runAndRecord();
  await audit(sb, me.id, "run_ai_pass", "ai", "manual", { ...(stats ?? {}), error });
  revalidatePath("/admin/ai");
  if (error) return { error };
  return { notice: stats?.stopped ? `Stopped: ${stats.stopped}` : `Checked ${stats?.moderated ?? 0} posts, ${stats?.flagged ?? 0} flagged, ${stats?.buyerMatches ?? 0} buyer and ${stats?.sellerMatches ?? 0} seller alerts` };
}
