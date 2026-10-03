"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-sm font-medium text-danger">Something went wrong</p>
      <h1 className="mt-1 text-xl font-semibold">We couldn&apos;t load this page</h1>
      <p className="mt-2 text-sm text-muted-foreground">This is usually temporary. Check your connection and try again. If it keeps happening, tell us and quote the reference below.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Try again</button>
        <Link href="/" className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-medium hover:bg-muted">Go home</Link>
      </div>
      {error.digest && <p className="mt-6 text-xs text-muted-foreground">Reference: <span className="font-mono">{error.digest}</span></p>}
    </div>
  );
}
