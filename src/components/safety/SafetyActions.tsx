"use client";
import { useState } from "react";
import { useSafeForm } from "@/lib/use-safe-form";
import { blockUser, submitReport } from "@/app/safety/actions";
import { Notice, Spinner, inputCls } from "@/components/ui/form";
import { Flag } from "@/components/ui/icons";
import { ConfirmButton } from "@/components/sell/ConfirmButton";

const REASONS = ["Prohibited item or service", "Scam or fraud", "Fake or misleading", "Wrong category", "Inappropriate content", "Harassment", "Other"];
const ghost = "inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground";

export function ReportButton({ kind, target, loggedIn, loginHref }: { kind: "listing" | "user" | "wanted"; target: string; loggedIn: boolean; loginHref: string }) {
  const [open, setOpen] = useState(false);
  const [state, onSubmit, pending] = useSafeForm(submitReport, {});
  if (!loggedIn) return <a href={loginHref} className={ghost}><Flag className="h-4 w-4" />Report</a>;
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={ghost}><Flag className="h-4 w-4" />Report</button>
      {open && (
        <form onSubmit={onSubmit} className="mt-2 space-y-3 rounded-xl border border-border bg-card p-4">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="target" value={target} />
          <label className="block text-sm font-medium">What&apos;s wrong?
            <select name="category" required defaultValue="" className={`${inputCls} mt-1.5`}>
              <option value="" disabled>Choose a reason</option>
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Details (optional)
            <textarea name="details" rows={2} maxLength={300} className={`${inputCls} mt-1.5 h-auto py-3`} />
          </label>
          <Notice error={state.error} notice={state.notice} />
          {!state.notice && (
            <div className="flex gap-2">
              <button disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white disabled:opacity-60">{pending && <Spinner />}Send report</button>
              <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted">Cancel</button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export function BlockButton({ target, back }: { target: string; back: string }) {
  return (
    <form action={blockUser}>
      <input type="hidden" name="id" value={target} />
      <input type="hidden" name="back" value={back} />
      <ConfirmButton message="Block this person? You won't see each other's contact buttons." className={ghost}>Block</ConfirmButton>
    </form>
  );
}
