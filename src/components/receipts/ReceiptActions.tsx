"use client";
import { useActionState, useState } from "react";
import { voidReceipt } from "@/app/receipts/actions";
import { Notice, Spinner } from "@/components/ui/form";

const btn = "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted";

export function ShareBar({ pdfHref, shareText, waHref, link }: { pdfHref: string; shareText: string; waHref: string; link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <a href={pdfHref} className={`${btn} bg-primary text-primary-foreground hover:bg-primary-hover border-transparent`}>Download PDF</a>
      <a href={waHref} target="_blank" rel="noopener noreferrer" aria-label={`Share on WhatsApp: ${shareText}`} className={`${btn} bg-[#16a34a] text-white hover:bg-[#15803d] border-transparent`}>Share on WhatsApp</a>
      <button type="button" className={btn} onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }}>
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}

export function VoidForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(voidReceipt, {});
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`${btn} text-danger`}>Void receipt</button>;
  return (
    <form action={action} className="space-y-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
      <input type="hidden" name="id" value={id} />
      <label className="block text-sm font-medium">Reason for voiding
        <input name="reason" required minLength={3} maxLength={300} placeholder="e.g. Buyer cancelled the order" className="mt-1.5 block h-12 w-full rounded-lg border border-border bg-card px-3.5 text-base outline-none focus:border-primary" />
      </label>
      <p className="text-xs text-muted-foreground">The receipt stays on record, marked VOID. Any stock it deducted is returned to the listing.</p>
      <Notice error={state.error} />
      <div className="flex gap-2">
        <button disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white disabled:opacity-60">{pending && <Spinner />}Confirm void</button>
        <button type="button" onClick={() => setOpen(false)} className={btn}>Cancel</button>
      </div>
    </form>
  );
}
