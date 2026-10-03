import type { ReactNode } from "react";
import { Alert, Check } from "./icons";

export const inputCls =
  "block w-full h-12 rounded-lg border border-border bg-card px-3.5 text-[15px] text-foreground placeholder:text-muted-foreground/70 " +
  "transition-colors hover:border-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:opacity-60";

export const btnPrimary =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-semibold text-primary-foreground " +
  "shadow-sm transition-colors hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Notice({ error, notice }: { error?: string; notice?: string }) {
  if (error)
    return (
      <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">
        <Alert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
      </p>
    );
  if (notice)
    return (
      <p role="status" className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3.5 py-3 text-sm text-success">
        <Check className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
      </p>
    );
  return null;
}

export function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}
