import Link from "next/link";
import type { FeedItem } from "@/lib/feed";
import { kes, timeAgo } from "@/lib/format";

export function ListingCard({ item }: { item: FeedItem }) {
  return (
    <Link href={`/listing/${item.id}`} className="group block overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] bg-muted">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">No photo</div>
        )}
        {item.featured && <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">Featured</span>}
      </div>
      <div className="p-3">
        <p className="font-bold tabular-nums">{kes(item.price)}</p>
        <h3 className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug group-hover:underline">{item.title}</h3>
        <p className="mt-2 truncate text-xs text-muted-foreground">{item.seller}</p>
        <p className="truncate text-xs text-muted-foreground">{item.location} · {timeAgo(item.created_at)}</p>
      </div>
    </Link>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="aspect-[4/3] animate-pulse bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
