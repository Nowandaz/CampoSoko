import Link from "next/link";
import type { FeedItem } from "@/lib/feed";
import { kes, timeAgo } from "@/lib/format";
import { CategoryIcon } from "@/components/ui/category-icons";

const isNew = (iso: string) => Date.now() - new Date(iso).getTime() < 86_400_000;

export function ListingCard({ item, compact = false, slug = "other" }: { item: FeedItem; compact?: boolean; slug?: string }) {
  return (
    <Link href={`/listing/${item.id}`} role={compact ? "listitem" : undefined}
      className={`group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md ${compact ? "w-[10.5rem] shrink-0 snap-start sm:w-52" : ""}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-primary-soft text-primary/60"><CategoryIcon slug={slug} className="h-10 w-10" /></div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          {item.featured && <span className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">Featured</span>}
          {!item.featured && isNew(item.created_at) && <span className="rounded-md bg-card/95 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-sm">New</span>}
        </div>
      </div>
      <div className="p-3">
        <p className="font-bold tabular-nums">{kes(item.price)}</p>
        <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug group-hover:underline">{item.title}</h3>
        <p className="mt-1.5 truncate text-xs text-muted-foreground">{item.seller}</p>
        <p className="truncate text-xs text-muted-foreground">{item.location} · {timeAgo(item.created_at)}</p>
      </div>
    </Link>
  );
}

export function GridSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      {[0, 1].map((r) => (
        <div key={r}>
          <div className="mb-3 h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[10.5rem] shrink-0 overflow-hidden rounded-xl border border-border bg-card sm:w-52">
                <div className="aspect-[4/3] animate-pulse bg-muted" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
