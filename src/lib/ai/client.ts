import "server-only";
import { APP_NAME, SITE_URL } from "@/config/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "./crypto";
import { getSettings } from "./settings";
import { explainHttpError, inferDefaults, weightedOrder } from "./client-pure";

export type Provider = { id: string; name: string; type: "openai" | "gemini" | "anthropic"; key: string; endpoint: string | null; model: string | null; weight: number };
export class AiUnavailable extends Error {}

export async function loadProviders(onlyActive = true): Promise<Provider[]> {
  const q = createAdminClient().from("ai_providers").select("id, name, type, api_key_enc, endpoint, model, weight, active");
  const { data, error } = await (onlyActive ? q.eq("active", true) : q);
  if (error || !data) return [];
  const out: Provider[] = [];
  for (const r of data) {
    try { out.push({ id: r.id, name: r.name, type: r.type, key: decrypt(r.api_key_enc).replace(/^bearer\s+/i, "").replace(/["'\s]/g, ""), endpoint: r.endpoint, model: r.model, weight: r.weight }); }
    catch { console.error(`[ai] could not decrypt key for provider "${r.name}" (was the secret rotated?)`); }
  }
  return out;
}

const trim = (u: string) => u.replace(/\/+$/, "");

const hostOf = (u: string) => { try { return new URL(u).host; } catch { return u; } };
async function fail(p: Provider, url: string, res: Response): Promise<never> {
  throw new Error(explainHttpError(p.name, hostOf(url), res.status, await res.text().catch(() => "")));
}

export async function callProvider(p0: Provider, system: string, user: string, maxTokens = 700, signal?: AbortSignal): Promise<string> {
  const p: Provider = { ...p0, ...inferDefaults(p0.type, p0.key, p0.endpoint, p0.model) };
  if (p.type === "anthropic") {
    const url = `${trim(p.endpoint || "https://api.anthropic.com")}/v1/messages`;
    const res = await fetch(url, {
      method: "POST", signal, headers: { "content-type": "application/json", "x-api-key": p.key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: p.model || "claude-haiku-4-5-20251001", max_tokens: maxTokens, temperature: 0.2, system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) return fail(p, url, res);
    const j = await res.json();
    return String(j?.content?.[0]?.text ?? "");
  }
  if (p.type === "gemini") {
    const model = p.model || "gemini-1.5-flash";
    const url = `${trim(p.endpoint || "https://generativelanguage.googleapis.com")}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const res = await fetch(url, {
      method: "POST", signal, headers: { "content-type": "application/json", "x-goog-api-key": p.key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens } }),
    });
    if (!res.ok) return fail(p, url, res);
    const j = await res.json();
    return String(j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
  }
  // OpenAI-compatible: OpenAI, OpenRouter, Groq, Together, and similar
  const url = `${trim(p.endpoint || "https://api.openai.com/v1")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST", signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${p.key}`, "HTTP-Referer": SITE_URL, "X-Title": APP_NAME },
    body: JSON.stringify({ model: p.model || "gpt-4o-mini", temperature: 0.2, max_tokens: maxTokens, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!res.ok) return fail(p, url, res);
  const j = await res.json();
  return String(j?.choices?.[0]?.message?.content ?? "");
}

async function bump(failed: boolean) {
  try {
    const admin = createAdminClient();
    const day = new Date().toISOString().slice(0, 10);
    const { data } = await admin.from("ai_usage").select("calls, failures").eq("day", day).maybeSingle();
    await admin.from("ai_usage").upsert({ day, calls: (data?.calls ?? 0) + 1, failures: (data?.failures ?? 0) + (failed ? 1 : 0) });
  } catch { /* usage stats are best-effort */ }
}

/** One AI call with failover across active providers. Throws AiUnavailable if AI is off, capped, or all providers fail. */
export async function ask(system: string, user: string, opts: { maxTokens?: number; ignoreCap?: boolean } = {}): Promise<string> {
  const settings = await getSettings();
  if (!settings.ai_enabled && !opts.ignoreCap) throw new AiUnavailable("AI is switched off");
  const providers = await loadProviders();
  if (!providers.length) throw new AiUnavailable("No AI provider is configured");
  if (!opts.ignoreCap) {
    const day = new Date().toISOString().slice(0, 10);
    const { data } = await createAdminClient().from("ai_usage").select("calls").eq("day", day).maybeSingle();
    if ((data?.calls ?? 0) >= settings.daily_cap) throw new AiUnavailable("Daily AI call limit reached");
  }
  let lastErr = "";
  for (const p of weightedOrder(providers).slice(0, 3)) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 30_000);
    try {
      const text = await callProvider(p, system, user, opts.maxTokens, ctl.signal);
      if (!text.trim()) throw new Error(`${p.name}: empty reply`);
      await bump(false);
      return text;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      await bump(true);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new AiUnavailable(lastErr || "All AI providers failed");
}

export async function aiReady() {
  const s = await getSettings();
  if (!s.ai_enabled) return false;
  return (await loadProviders()).length > 0;
}

/** Cheap check used by pages to decide whether to show an AI feature (no key decryption). */
export async function aiFeatureOn(feature: "ai_search" | "ai_shop_helper") {
  try {
    const s = await getSettings();
    if (!s.ai_enabled || !s[feature]) return false;
    const { count } = await createAdminClient().from("ai_providers").select("id", { count: "exact", head: true }).eq("active", true);
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}
