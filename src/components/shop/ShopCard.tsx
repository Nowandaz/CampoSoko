import Link from "next/link";
import type { Shop } from "@/lib/shops";
import { Rating } from "./Rating";

export function ShopCard({ shop, compact = false }: { shop: Shop; compact?: boolean }) {
  return (
    <Link href={`/shop/${shop.user_id}`} role={compact ? "listitem" : undefined}
      className={`flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${compact ? "w-64 shrink-0 snap-start" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-lg font-semibold text-primary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {shop.avatar_url ? <img src={shop.avatar_url} alt="" className="h-full w-full object-cover" /> : shop.shop_name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{shop.shop_name}</p>
          <p className="truncate text-xs text-muted-foreground">{shop.location}</p>
        </div>
      </div>
      {shop.tags.length > 0 && (
        <p className="flex flex-wrap gap-1.5">
          {shop.tags.slice(0, 3).map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t}</span>)}
          {shop.tags.length > 3 && <span className="px-1 text-xs text-muted-foreground">+{shop.tags.length - 3}</span>}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2">
        <Rating up={shop.up} down={shop.down} />
        {shop.listing_count != null && <span className="text-xs text-muted-foreground">{shop.listing_count} item{shop.listing_count === 1 ? "" : "s"}</span>}
      </div>
    </Link>
  );
}
