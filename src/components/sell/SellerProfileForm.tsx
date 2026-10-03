"use client";
import { useState } from "react";
import { useSafeForm } from "@/lib/use-safe-form";

import { saveSellerProfile } from "@/app/sell/actions";
import { Field, Notice, Spinner, btnPrimary, inputCls } from "@/components/ui/form";
import { ImageUploader } from "./ImageUploader";
import { TagInput } from "./TagInput";
import { suggestShop, type ShopAiState } from "@/app/sell/ai-actions";

type Initial = { shop_name: string; location: string; description: string; avatar_url: string | null; tags?: string[] };

export function SellerProfileForm({ userId, initial, next, aiHelper = false }: { userId: string; initial?: Initial; next: string; aiHelper?: boolean }) {
  const [s, action, pending] = useSafeForm(saveSellerProfile, {});
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [shopName, setShopName] = useState(initial?.shop_name ?? "");
  const [notes, setNotes] = useState("");
  const [ai, setAi] = useState<ShopAiState>({});
  const [busy, setBusy] = useState(false);
  async function draft() {
    setBusy(true); setAi({});
    const fd = new FormData(); fd.set("notes", notes); fd.set("shop", shopName);
    const res = await suggestShop({}, fd);
    setBusy(false); setAi(res);
    if (res.description) { setDescription(res.description); setTags((t) => [...new Set([...t, ...(res.tags ?? [])])].slice(0, 12)); }
  }
  return (
    <form onSubmit={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      {aiHelper && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft p-4">
          <p className="text-sm font-semibold">Need help writing this? Let AI draft it</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Describe what you sell or offer in a few rough words. We will draft your description and tags. You can edit everything.</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={600} placeholder="e.g. I sell used phones and laptops in Hall 4, also do phone repairs" className={`${inputCls} mt-2 h-auto bg-card py-3`} />
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={draft} disabled={busy || notes.trim().length < 8} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">{busy && <Spinner />}Draft with AI</button>
            {ai.error && <span role="alert" className="text-sm text-danger">{ai.error}</span>}
            {ai.description && <span role="status" className="text-sm text-success">Drafted. Check the description and tags below.</span>}
          </div>
        </div>
      )}
      <Field label="Shop or display name">
        <input name="shop_name" value={shopName} onChange={(e) => setShopName(e.target.value)} required minLength={2} maxLength={60} placeholder="e.g. Amina's Tech Corner" className={inputCls} />
      </Field>
      <Field label="Location on campus" hint="Hostel, block or area where buyers can find you.">
        <input name="location" defaultValue={initial?.location} required minLength={2} maxLength={100} placeholder="e.g. Hall 4, Block B" className={inputCls} />
      </Field>
      <Field label="About your shop" hint="At least 20 characters. Tell buyers what you sell or offer.">
        <textarea name="description" value={description} onChange={(e) => setDescription(e.target.value)} required minLength={20} maxLength={600} rows={4} className={`${inputCls} h-auto py-3`} />
      </Field>
      <Field label="What you sell or offer" hint="Add tags like laptops, textbooks, logo design, tutoring. When someone posts a wanted ad that matches, we alert you. Up to 12.">
        <TagInput name="tags" value={tags} onChange={setTags} />
      </Field>
      <ImageUploader userId={userId} bucket="avatars" max={1} name="avatar" label="Profile photo (optional)"
        initial={initial?.avatar_url ? [initial.avatar_url] : []} />
      <Notice error={s.error} />
      <button className={btnPrimary} disabled={pending}>{pending && <Spinner />}{pending ? "Saving" : initial ? "Save changes" : "Save and continue"}</button>
    </form>
  );
}
