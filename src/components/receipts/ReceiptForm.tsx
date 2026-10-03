"use client";
import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { createReceipt } from "@/app/receipts/actions";
import { Field, Notice, Spinner, btnPrimary, inputCls } from "@/components/ui/form";
import { money } from "@/lib/receipts";

type L = { id: string; title: string; price: number; type: string; quantity: number | null; status: string };
type Row = { key: number; name: string; qty: string; price: string };
let k = 1;

export function ReceiptForm({ listings, preselect, today }: { listings: L[]; preselect?: string; today: string }) {
  const [state, action, pending] = useActionState(createReceipt, {});
  const initial = listings.find((l) => l.id === preselect);
  const [listingId, setListingId] = useState(initial?.id ?? "");
  const [rows, setRows] = useState<Row[]>([{ key: k++, name: initial?.title ?? "", qty: "1", price: initial ? String(initial.price) : "" }]);
  const [method, setMethod] = useState<"mpesa" | "cash" | "other">("mpesa");
  const total = useMemo(() => rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.price) || 0), 0), [rows]);
  const selected = listings.find((l) => l.id === listingId);

  function pick(id: string) {
    setListingId(id);
    const l = listings.find((x) => x.id === id);
    if (l) setRows((rs) => [{ ...rs[0], name: l.title, price: String(l.price), qty: rs[0].qty || "1" }, ...rs.slice(1)]);
  }
  const set = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="listing_id" value={listingId} />
      <input type="hidden" name="payment_method" value={method} />

      <Field label="Listing (optional)" hint={selected?.type === "goods" ? "The quantity of the first item below is deducted from this listing's stock." : "Pick one of your listings, or leave blank for a custom item."}>
        <select value={listingId} onChange={(e) => pick(e.target.value)} className={inputCls}>
          <option value="">Custom item (not from a listing)</option>
          {listings.map((l) => <option key={l.id} value={l.id}>{l.title}{l.type === "goods" && l.quantity != null ? ` (${l.quantity} left)` : ""}</option>)}
        </select>
      </Field>

      <fieldset className="space-y-3">
        <legend className="mb-1.5 text-sm font-medium">Items sold</legend>
        {rows.map((r, i) => (
          <div key={r.key} className="grid grid-cols-2 gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_5rem_8rem_auto] sm:items-end">
            <label className="col-span-2 text-xs text-muted-foreground sm:col-span-1">Item
              <input name="item_name" value={r.name} onChange={(e) => set(r.key, { name: e.target.value })} required maxLength={100} className={`${inputCls} mt-1 text-foreground`} />
            </label>
            <label className="text-xs text-muted-foreground">Qty
              <input name="item_qty" type="number" inputMode="numeric" min={1} max={9999} value={r.qty} onChange={(e) => set(r.key, { qty: e.target.value })} required className={`${inputCls} mt-1 text-foreground`} />
            </label>
            <label className="text-xs text-muted-foreground">Unit price (KES)
              <input name="item_price" type="number" inputMode="decimal" min={0} step="any" value={r.price} onChange={(e) => set(r.key, { price: e.target.value })} required className={`${inputCls} mt-1 text-foreground`} />
            </label>
            {rows.length > 1 && (
              <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label={`Remove item ${i + 1}`}
                className="col-span-2 h-10 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 sm:col-span-1 sm:w-10">Remove</button>
            )}
          </div>
        ))}
        {rows.length < 20 && (
          <button type="button" onClick={() => setRows((rs) => [...rs, { key: k++, name: "", qty: "1", price: "" }])}
            className="h-10 rounded-lg border border-dashed border-border px-4 text-sm font-medium text-primary hover:bg-primary-soft">+ Add another item</button>
        )}
        <p className="flex items-center justify-between rounded-xl bg-primary-soft px-4 py-3 text-sm"><span className="font-medium">Total</span><span className="text-xl font-bold tabular-nums">{money(total)}</span></p>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Buyer name"><input name="buyer_name" required minLength={2} maxLength={80} className={inputCls} /></Field>
        <Field label="Sale date"><input name="sale_date" type="date" defaultValue={today} max={today} required className={inputCls} /></Field>
        <Field label="Buyer phone" hint="Phone or email is required. Used to link the receipt to the buyer's account."><input name="buyer_phone" type="tel" placeholder="0712 345 678" className={inputCls} /></Field>
        <Field label="Buyer email"><input name="buyer_email" type="email" className={inputCls} /></Field>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Payment method</span>
        <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {([["mpesa", "M-Pesa"], ["cash", "Cash"], ["other", "Other"]] as const).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={method === v} onClick={() => setMethod(v)}
              className={`h-10 rounded-md text-sm font-medium ${method === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
          ))}
        </div>
      </div>
      {method === "mpesa" && (
        <Field label="M-Pesa code (optional)"><input name="mpesa_code" maxLength={12} placeholder="e.g. QJ12ABC34D" autoCapitalize="characters" className={`${inputCls} uppercase`} /></Field>
      )}
      <Field label="Notes (optional)"><textarea name="notes" rows={2} maxLength={500} className={`${inputCls} h-auto py-3`} /></Field>

      <p className="text-xs text-muted-foreground">Receipts can&apos;t be edited once issued. If something is wrong you can void it with a reason and issue a new one.</p>
      <Notice error={state.error} />
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <button className={`${btnPrimary} sm:w-auto sm:min-w-48`} disabled={pending}>{pending && <Spinner />}{pending ? "Issuing" : "Issue receipt"}</button>
        <Link href="/receipts" className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-5 text-[15px] font-medium hover:bg-muted">Cancel</Link>
      </div>
    </form>
  );
}
