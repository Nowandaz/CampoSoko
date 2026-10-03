"use client";
import { useRef, useState, useTransition } from "react";
import { useSafeForm } from "@/lib/use-safe-form";
import { deleteProvider, runAiNow, saveAiSettings, saveProvider, testProviders, toggleProvider, type AiState } from "@/app/admin/ai-actions";
import { Notice, Spinner, inputCls } from "@/components/ui/form";
import { Check, Alert, X } from "@/components/ui/icons";
import { smallBtn } from "./ui";

export type ProviderRow = { id: string; name: string; type: "openai" | "gemini" | "anthropic"; key_hint: string | null; endpoint: string | null; model: string | null; weight: number; active: boolean };
export type SettingsRow = { ai_enabled: boolean; daily_cap: number; run_cap: number; auto_hide: boolean; ai_search: boolean; ai_shop_helper: boolean; notify_photo_reviews: boolean };

const PRESETS = [
  { label: "OpenRouter (free models)", type: "openai", endpoint: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.3-70b-instruct:free" },
  { label: "Groq", type: "openai", endpoint: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  { label: "OpenAI", type: "openai", endpoint: "", model: "gpt-4o-mini" },
  { label: "Gemini", type: "gemini", endpoint: "", model: "gemini-1.5-flash" },
  { label: "Anthropic", type: "anthropic", endpoint: "", model: "claude-haiku-4-5-20251001" },
] as const;

function Switch({ on, label, action, id }: { on: boolean; label: string; action: (fd: FormData) => Promise<void>; id: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="active" value={String(!on)} />
      <button aria-label={label} aria-pressed={on} className={`relative h-7 w-12 rounded-full transition-colors ${on ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
      </button>
    </form>
  );
}

export function ProviderDialog({ p, children }: { p?: ProviderRow; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, onSubmit, pending] = useSafeForm(saveProvider, {});
  const [fields, setFields] = useState({ type: p?.type ?? "openai", endpoint: p?.endpoint ?? "", model: p?.model ?? "" });
  const label = "block text-sm font-medium";
  const hint = "mt-1 block text-xs text-muted-foreground";
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={p ? "grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" : "inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"} aria-label={p ? `Edit ${p.name}` : undefined}>{children}</button>
      <dialog ref={ref} onClose={() => undefined} className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/50">
        <form onSubmit={onSubmit} className="max-h-[85vh] space-y-4 overflow-y-auto p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{p ? "Edit AI provider" : "Add AI provider"}</h2>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted"><X /></button>
          </div>
          {p && <input type="hidden" name="id" value={p.id} />}
          {!p && (
            <div className="flex flex-wrap gap-2" aria-label="Presets">
              {PRESETS.map((x) => (
                <button key={x.label} type="button" onClick={() => setFields({ type: x.type, endpoint: x.endpoint, model: x.model })} className="h-9 rounded-full border border-border px-3 text-xs font-medium hover:bg-muted">{x.label}</button>
              ))}
            </div>
          )}
          <label className={label}>Provider name<input name="name" defaultValue={p?.name} required maxLength={60} placeholder="OpenRouter 1" className={`${inputCls} mt-1`} /></label>
          <label className={label}>Type
            <select name="type" value={fields.type} onChange={(e) => setFields((f) => ({ ...f, type: e.target.value as ProviderRow["type"] }))} className={`${inputCls} mt-1`}>
              <option value="openai">openai (also OpenRouter, Groq, Together)</option><option value="gemini">gemini</option><option value="anthropic">anthropic</option>
            </select>
          </label>
          <label className={label}>API key {p ? "(leave empty to keep current)" : ""}
            <input name="api_key" type="password" autoComplete="off" placeholder={p ? `Current: ${p.key_hint ?? "saved"}` : "sk-or-v1-..."} className={`${inputCls} mt-1`} />
            <span className={hint}>Stored encrypted on the server. It is never shown again.</span>
          </label>
          <label className={label}>Endpoint URL (optional)
            <input name="endpoint" value={fields.endpoint} onChange={(e) => setFields((f) => ({ ...f, endpoint: e.target.value }))} placeholder="https://openrouter.ai/api/v1" className={`${inputCls} mt-1`} />
            <span className={hint}>Base URL only. Do not add /chat/completions.</span>
          </label>
          <label className={label}>Model (optional)
            <input name="model" value={fields.model} onChange={(e) => setFields((f) => ({ ...f, model: e.target.value }))} placeholder="meta-llama/llama-3.3-70b-instruct:free" className={`${inputCls} mt-1`} />
          </label>
          <label className={label}>Weight
            <input name="weight" type="number" min={1} max={100} defaultValue={p?.weight ?? 1} className={`${inputCls} mt-1`} />
            <span className={hint}>With several active providers, a higher weight is tried first more often. Failures fall back to the next one.</span>
          </label>
          <Notice error={state.error} notice={state.notice} />
          <button disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">{pending && <Spinner />}{p ? "Update provider" : "Add provider"}</button>
        </form>
      </dialog>
    </>
  );
}

export function ProviderList({ providers }: { providers: ProviderRow[] }) {
  if (!providers.length) return <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No providers yet. Add an OpenRouter key to switch the AI features on.</p>;
  return (
    <ul className="space-y-3">
      {providers.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
          <div className="min-w-0">
            <p className="font-semibold">{p.name}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground ring-1 ring-inset ring-border">{p.type}</span>
              <span>Weight {p.weight}</span>
              {p.model && <span className="truncate">Model: {p.model}</span>}
              {p.endpoint && <span className="truncate">{p.endpoint}</span>}
              <span>Key {p.key_hint ?? "saved"}</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Switch on={p.active} id={p.id} action={toggleProvider} label={`${p.active ? "Disable" : "Enable"} ${p.name}`} />
            <ProviderDialog p={p}>Edit</ProviderDialog>
            <form action={deleteProvider} onSubmit={(e) => { if (!confirm(`Delete ${p.name}?`)) e.preventDefault(); }}>
              <input type="hidden" name="id" value={p.id} />
              <button aria-label={`Delete ${p.name}`} className="grid h-10 w-10 place-items-center rounded-lg text-danger hover:bg-danger/10"><X /></button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TestButton() {
  const [res, setRes] = useState<AiState>({});
  const [pending, start] = useTransition();
  return (
    <div>
      <button onClick={() => start(async () => setRes(await testProviders()))} disabled={pending} className={`${smallBtn} gap-2`}>{pending && <Spinner />}Test providers</button>
      {(res.error || res.results) && (
        <div className="mt-3 space-y-1.5" role="status">
          {res.error && <p className="text-sm text-danger">{res.error}</p>}
          {res.results?.map((r) => (
            <p key={r.name} className="flex items-center gap-2 text-sm">
              {r.ok ? <Check className="h-4 w-4 text-success" /> : <Alert className="h-4 w-4 text-danger" />}
              <b className="font-medium">{r.name}</b><span className="text-muted-foreground">{r.ms} ms · {r.detail}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function RunNowButton() {
  const [res, setRes] = useState<AiState>({});
  const [pending, start] = useTransition();
  return (
    <div>
      <button onClick={() => start(async () => setRes(await runAiNow()))} disabled={pending} className={`${smallBtn} gap-2`}>{pending && <Spinner />}Run AI check now</button>
      <div className="mt-2"><Notice error={res.error} notice={res.notice} /></div>
    </div>
  );
}

export function SettingsForm({ s }: { s: SettingsRow }) {
  const [state, onSubmit, pending] = useSafeForm(saveAiSettings, {});
  const toggle = (name: keyof SettingsRow, title: string, text: string) => (
    <label className="flex items-start gap-3 py-2.5">
      <input type="checkbox" name={name} defaultChecked={Boolean(s[name])} className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]" />
      <span className="text-sm"><b className="font-medium">{title}</b><span className="block text-muted-foreground">{text}</span></span>
    </label>
  );
  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-card p-5 ring-1 ring-border">
      <div className="divide-y divide-border">
        {toggle("ai_enabled", "AI features on", "Master switch for everything below.")}
        {toggle("auto_hide", "Auto-hide clearly prohibited posts", "Off by default. When on, posts the AI is 90% sure break the rules are removed and the seller is told. Otherwise they are only flagged for you.")}
        {toggle("ai_search", "Smart search for buyers", "Lets buyers type a normal sentence like “cheap laptop for coding under 25k”.")}
        {toggle("ai_shop_helper", "Shop writing helper for sellers", "Drafts a shop description and tags from a few rough notes.")}
        {toggle("notify_photo_reviews", "Notify me about new listings with photos", "AI does not look at photos. You get a bell alert and review them in Listings.")}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Max AI calls per day<input name="daily_cap" type="number" min={10} defaultValue={s.daily_cap} className={`${inputCls} mt-1`} /></label>
        <label className="text-sm font-medium">Max AI calls per hourly run<input name="run_cap" type="number" min={1} max={200} defaultValue={s.run_cap} className={`${inputCls} mt-1`} /></label>
      </div>
      <div className="mt-3"><Notice error={state.error} notice={state.notice} /></div>
      <button disabled={pending} className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">{pending && <Spinner />}Save settings</button>
    </form>
  );
}
