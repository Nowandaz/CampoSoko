"use client";
import { useState } from "react";
import { useSafeForm } from "@/lib/use-safe-form";
import { deleteAccount } from "@/app/account/delete-action";
import { Notice, Spinner, inputCls } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/PasswordInput";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, onSubmit, pending] = useSafeForm(deleteAccount, {});
  return (
    <section className="mt-6 rounded-2xl border border-danger/30 bg-card p-6" aria-labelledby="danger">
      <h2 id="danger" className="text-lg font-semibold text-danger">Delete account</h2>
      <p className="mt-1 text-sm text-muted-foreground">This permanently removes your profile, shop, listings, wanted ads, photos and notifications. It can&apos;t be undone.</p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-4 h-11 rounded-lg border border-danger/40 px-4 text-sm font-semibold text-danger hover:bg-danger/10">Delete my account</button>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Receipts you issued or received stay as plain records, without a link to you.</li>
            <li>Your WhatsApp number and email are removed from our database.</li>
            <li>You&apos;ll get a confirmation email.</li>
          </ul>
          <label className="block text-sm font-medium">Type <b>DELETE</b> to confirm
            <input name="confirm" autoComplete="off" required className={`${inputCls} mt-1.5`} />
          </label>
          <label className="block text-sm font-medium">Your password
            <div className="mt-1.5"><PasswordInput name="password" autoComplete="current-password" /></div>
          </label>
          <Notice error={state.error} />
          <div className="flex gap-2">
            <button disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-lg bg-danger px-5 text-sm font-semibold text-white disabled:opacity-60">{pending && <Spinner />}Permanently delete</button>
            <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted">Keep my account</button>
          </div>
        </form>
      )}
    </section>
  );
}
