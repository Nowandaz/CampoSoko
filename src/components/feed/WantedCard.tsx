import Link from "next/link";
import type { WantedItem } from "@/lib/feed";
import { kes, timeAgo } from "@/lib/format";

export function WantedCard({ w, compact = false }: { w: WantedItem; compact?: boolean }) {
  return (
    <Link href={`/wanted/${w.id}`} role={compact ? "listitem" : undefined}
      className={`flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${compact ? "w-64 shrink-0 snap-start" : ""}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-primary">{w.type === "goods" ? "Item" : "Service"} · {w.category}</p>
      <h3 className="mt-1 line-clamp-2 font-semibold leading-snug">{w.title}</h3>
      <p className="mt-auto pt-3 text-sm font-medium">{w.budget != null ? `Budget ${kes(w.budget)}` : "No budget set"}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{w.user} · {timeAgo(w.created_at)}</p>
    </Link>
  );
}
