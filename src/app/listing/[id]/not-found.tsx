import Link from "next/link";
export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">Listing not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">It may have been sold, expired or removed.</p>
      <Link href="/" className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Browse listings</Link>
    </div>
  );
}
