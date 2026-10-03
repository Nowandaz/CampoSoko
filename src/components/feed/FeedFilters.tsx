import Link from "next/link";
import type { FeedParams, Tab } from "@/lib/feed";
import { inputCls } from "@/components/ui/form";

type Opt = { id: string; name: string };
const tabs: { key: Tab; label: string }[] = [
  { key: "goods", label: "Goods" },
  { key: "services", label: "Services" },
  { key: "wanted", label: "Wanted" },
];

export function FeedFilters({ p, campuses, categories, myCampus }: {
  p: FeedParams; campuses: Opt[]; categories: (Opt & { applies_to: string })[]; myCampus?: string;
}) {
  const cats = categories.filter((c) => p.tab === "wanted" || c.applies_to === "both" || c.applies_to === (p.tab === "services" ? "service" : "goods"));
  const campusValue = p.campusId ?? "all";
  const keep = (tab: Tab) => {
    const sp = new URLSearchParams({ tab });
    if (p.q) sp.set("q", p.q);
    sp.set("campus", campusValue);
    return `/?${sp}`;
  };
  const hasFilters = Boolean(p.category || p.min != null || p.max != null);
  return (
    <div className="space-y-4">
      <nav aria-label="Feed" className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <Link key={t.key} href={keep(t.key)} aria-current={p.tab === t.key ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${p.tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      <form action="/" className="space-y-3">
        <input type="hidden" name="tab" value={p.tab} />
        <div className="flex gap-2">
          <input type="search" name="q" defaultValue={p.q} placeholder={`Search ${p.tab === "wanted" ? "wanted ads" : p.tab}`} aria-label="Search" className={inputCls} />
          <button className="h-12 shrink-0 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Search</button>
        </div>
        <details open={hasFilters} className="rounded-lg border border-border bg-card">
          <summary className="cursor-pointer select-none px-3.5 py-2.5 text-sm font-medium">Filters{hasFilters ? " (active)" : ""}</summary>
          <div className="grid gap-3 border-t border-border p-3.5 sm:grid-cols-4">
            <label className="text-sm">Campus
              <select name="campus" defaultValue={campusValue} className={`${inputCls} mt-1`}>
                <option value="all">All campuses</option>
                {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}{c.id === myCampus ? " (yours)" : ""}</option>)}
              </select>
            </label>
            <label className="text-sm">Category
              <select name="category" defaultValue={p.category ?? ""} className={`${inputCls} mt-1`}>
                <option value="">All categories</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            {p.tab !== "wanted" && (
              <label className="text-sm">Min price (KES)
                <input type="number" name="min" min={0} defaultValue={p.min} className={`${inputCls} mt-1`} />
              </label>
            )}
            <label className="text-sm">{p.tab === "wanted" ? "Max budget (KES)" : "Max price (KES)"}
              <input type="number" name="max" min={0} defaultValue={p.max} className={`${inputCls} mt-1`} />
            </label>
          </div>
          <div className="flex gap-3 border-t border-border px-3.5 py-2.5">
            <button className="text-sm font-semibold text-primary hover:underline">Apply filters</button>
            <Link href={`/?tab=${p.tab}`} className="text-sm text-muted-foreground hover:text-foreground">Clear</Link>
          </div>
        </details>
      </form>
    </div>
  );
}
