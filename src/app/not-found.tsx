import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-1 text-xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">The link may be old, or the listing may have been sold or removed.</p>
      <Link href="/" className="mt-5 inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Back to the soko</Link>
    </div>
  );
}
