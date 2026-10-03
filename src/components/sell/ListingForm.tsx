"use client";
import { useActionState, useState } from "react";
import { createListing, updateListing } from "@/app/sell/actions";
import { Field, Notice, Spinner, btnPrimary, inputCls } from "@/components/ui/form";
import { ImageUploader } from "./ImageUploader";
import Link from "next/link";

type Cat = { id: string; name: string; applies_to: "goods" | "service" | "both" };
export type ListingInitial = {
  id: string; type: "goods" | "service"; title: string; description: string; category_id: string;
  condition: "new" | "used" | null; quantity: number | null; price: number; location: string;
  delivery_time: string | null; portfolio_url: string | null; images: string[];
};

type FormAction = (prev: { error?: string }, fd: FormData) => Promise<{ error?: string }>;

export function ListingForm({ userId, categories, defaultLocation, initial, formAction, extraTop, cancelHref = "/dashboard" }: {
  userId: string; categories: Cat[]; defaultLocation: string; initial?: ListingInitial;
  /** Admin pages pass their own server action; defaults to the seller's create/update. */
  formAction?: FormAction; extraTop?: React.ReactNode; cancelHref?: string;
}) {
  const editing = Boolean(initial);
  const [state, action, pending] = useActionState(formAction ?? (editing ? updateListing : createListing), {});
  const [type, setType] = useState<"goods" | "service">(initial?.type ?? "goods");
  const cats = categories.filter((c) => c.applies_to === "both" || c.applies_to === type);

  return (
    <form action={action} className="space-y-5">
      {extraTop}
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="type" value={type} />

      {!editing && (
        <div role="tablist" aria-label="Listing type" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(["goods", "service"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={type === t} onClick={() => setType(t)}
              className={`h-10 rounded-md text-sm font-medium transition-colors ${type === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "goods" ? "Goods" : "Online service"}
            </button>
          ))}
        </div>
      )}

      {type === "service" && (
        <p className="rounded-lg border border-primary/30 bg-primary-soft px-3.5 py-3 text-sm">
          Online services only. Agree on scope and payment milestones before work starts.
        </p>
      )}

      <Field label={type === "goods" ? "Item name" : "Service title"}>
        <input name="title" defaultValue={initial?.title} required minLength={3} maxLength={100}
          placeholder={type === "goods" ? "e.g. HP laptop, 8GB RAM" : "e.g. Poster and flyer design"} className={inputCls} />
      </Field>
      <Field label="Description">
        <textarea name="description" defaultValue={initial?.description} required minLength={10} maxLength={2000} rows={5} className={`${inputCls} h-auto py-3`} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category">
          <select key={type} name="category_id" defaultValue={cats.some((c) => c.id === initial?.category_id) ? initial?.category_id : ""} required className={inputCls}>
            <option value="" disabled>Select a category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={type === "goods" ? "Price (KES)" : "Starting price (KES)"}>
          <input name="price" type="number" inputMode="decimal" min={0} step="any" defaultValue={initial?.price} required className={inputCls} />
        </Field>
      </div>

      {type === "goods" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Condition">
            <select name="condition" defaultValue={initial?.condition ?? ""} required className={inputCls}>
              <option value="" disabled>Select condition</option>
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </Field>
          <Field label="Quantity available">
            <input name="quantity" type="number" min={1} max={9999} defaultValue={initial?.quantity ?? 1} required className={inputCls} />
          </Field>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Delivery time" hint="For example: 2 days">
            <input name="delivery_time" defaultValue={initial?.delivery_time ?? ""} required maxLength={40} className={inputCls} />
          </Field>
          <Field label="Portfolio link (optional)">
            <input name="portfolio_url" type="url" defaultValue={initial?.portfolio_url ?? ""} placeholder="https://" className={inputCls} />
          </Field>
        </div>
      )}

      <Field label={type === "goods" ? "Location" : "Where you are based"}>
        <input name="location" defaultValue={initial?.location ?? defaultLocation} required minLength={2} maxLength={100} className={inputCls} />
      </Field>

      <ImageUploader userId={userId} bucket="listing-images" name="images" initial={initial?.images}
        label={type === "goods" ? "Photos (up to 5)" : "Sample images (up to 5)"} hint="JPG, PNG or WebP. Images are resized automatically." />

      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input type="checkbox" name="prohibited_ack" required defaultChecked={editing} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" />
        <span>
          I confirm this listing does not include prohibited items (alcohol, drugs, weapons, stolen or counterfeit goods, exam papers or cheating services, adult content, or anything illegal in Kenya).{" "}
          <Link href="/terms" className="font-medium text-primary hover:underline">Read the terms</Link>
        </span>
      </label>

      <Notice error={state.error} />
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <button className={`${btnPrimary} sm:w-auto sm:min-w-44`} disabled={pending}>
          {pending && <Spinner />}{pending ? "Saving" : editing ? "Save changes" : "Publish listing"}
        </button>
        <Link href={cancelHref} className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-5 text-[15px] font-medium hover:bg-muted">Cancel</Link>
      </div>
    </form>
  );
}
