"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { createWanted } from "@/app/wanted/actions";
import { Field, Notice, Spinner, btnPrimary, inputCls } from "@/components/ui/form";

type Cat = { id: string; name: string; applies_to: "goods" | "service" | "both" };

export function WantedForm({ categories }: { categories: Cat[] }) {
  const [state, action, pending] = useActionState(createWanted, {});
  const [type, setType] = useState<"goods" | "service">("goods");
  const cats = categories.filter((c) => c.applies_to === "both" || c.applies_to === type);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="type" value={type} />
      <div role="tablist" aria-label="What are you looking for" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(["goods", "service"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={type === t} onClick={() => setType(t)}
            className={`h-10 rounded-md text-sm font-medium transition-colors ${type === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "goods" ? "An item" : "An online service"}
          </button>
        ))}
      </div>
      <Field label="What do you need?">
        <input name="title" required minLength={3} maxLength={100} placeholder={type === "goods" ? "e.g. Second-hand scientific calculator" : "e.g. Logo design for a campus club"} className={inputCls} />
      </Field>
      <Field label="Details">
        <textarea name="description" required minLength={10} maxLength={1000} rows={4} placeholder="Brand, condition, deadline, anything that helps sellers." className={`${inputCls} h-auto py-3`} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category">
          <select key={type} name="category_id" required defaultValue="" className={inputCls}>
            <option value="" disabled>Select a category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Budget (KES, optional)">
          <input name="budget" type="number" inputMode="decimal" min={0} step="any" className={inputCls} />
        </Field>
      </div>
      <Field label="Keywords (optional)" hint="Comma separated, for example: casio, fx-991, calculator. We use them to spot matching listings.">
        <input name="keywords" maxLength={300} className={inputCls} />
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="notify" defaultChecked className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" />
        <span><b className="font-medium">Notify me if something similar comes up.</b><br /><span className="text-muted-foreground">We will email you and add an alert when a matching listing is posted on your campus.</span></span>
      </label>
      <Notice error={state.error} />
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <button className={`${btnPrimary} sm:w-auto sm:min-w-44`} disabled={pending}>{pending && <Spinner />}{pending ? "Posting" : "Post wanted ad"}</button>
        <Link href="/?tab=wanted" className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-5 text-[15px] font-medium hover:bg-muted">Cancel</Link>
      </div>
    </form>
  );
}
