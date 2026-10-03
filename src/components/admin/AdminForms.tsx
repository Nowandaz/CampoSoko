"use client";
import { useActionState } from "react";
import { adminVoidReceipt, saveCampus, saveCategory, type AState } from "@/app/admin/actions";
import { inputCls } from "@/components/ui/form";
import { smallBtn } from "./ui";

const msg = (s: AState) => (s.error ? <p role="alert" className="text-xs text-danger">{s.error}</p> : s.notice ? <p role="status" className="text-xs text-success">{s.notice}</p> : null);
const f = `${inputCls} h-10`;

type Campus = { id?: string; name?: string; county?: string | null; email_domain?: string | null };
export function CampusForm({ c }: { c?: Campus }) {
  const [s, action, pending] = useActionState(saveCampus, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1.2fr_auto] sm:items-start">
      {c?.id && <input type="hidden" name="id" value={c.id} />}
      <input name="name" defaultValue={c?.name} placeholder="Campus name" required aria-label="Campus name" className={f} />
      <input name="county" defaultValue={c?.county ?? ""} placeholder="County" aria-label="County" className={f} />
      <input name="email_domain" defaultValue={c?.email_domain ?? ""} placeholder="Email domain (optional)" aria-label="Email domain" className={f} />
      <div className="space-y-1"><button disabled={pending} className={`${smallBtn} h-10`}>{c?.id ? "Save" : "Add campus"}</button>{msg(s)}</div>
    </form>
  );
}

type Cat = { id?: string; name?: string; slug?: string; applies_to?: string; sort_order?: number };
export function CategoryForm({ c }: { c?: Cat }) {
  const [s, action, pending] = useActionState(saveCategory, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1.2fr_1.2fr_1fr_5rem_auto] sm:items-start">
      {c?.id && <input type="hidden" name="id" value={c.id} />}
      <input name="name" defaultValue={c?.name} placeholder="Name" required aria-label="Name" className={f} />
      <input name="slug" defaultValue={c?.slug} placeholder="slug-like-this" required aria-label="Slug" className={f} />
      <select name="applies_to" defaultValue={c?.applies_to ?? "both"} aria-label="Applies to" className={f}><option value="goods">Goods</option><option value="service">Services</option><option value="both">Both</option></select>
      <input name="sort_order" type="number" defaultValue={c?.sort_order ?? 50} min={0} max={999} aria-label="Sort order" className={f} />
      <div className="space-y-1"><button disabled={pending} className={`${smallBtn} h-10`}>{c?.id ? "Save" : "Add"}</button>{msg(s)}</div>
    </form>
  );
}

export function AdminVoid({ id }: { id: string }) {
  const [s, action, pending] = useActionState(adminVoidReceipt, {});
  return (
    <form action={action} className="flex flex-wrap items-start gap-1.5">
      <input type="hidden" name="id" value={id} />
      <input name="reason" required minLength={3} maxLength={300} placeholder="Reason" aria-label="Void reason" className={`${f} w-40`} />
      <button disabled={pending} className={`${smallBtn} h-10 text-danger`}>Void</button>
      {msg(s)}
    </form>
  );
}
