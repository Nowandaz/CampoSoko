"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-20 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">That didn&apos;t work. It may be a temporary problem. Please try again.</p>
      <button onClick={reset} className="mt-5 inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Try again</button>
    </div>
  );
}
