import Link from "next/link";
import type { FeedParams, Tab, Cat } from "@/lib/feed";
import { inputCls } from "@/components/ui/form";
import { CategoryIcon } from "@/components/ui/category-icons";

type Opt = { id: string; name: string };
const tabs: { key: Tab; label: string }[] = [
  { key: "goods", label: "Goods" },
  { key: "services", label: "Services" },
  { key: "wanted", label: "Wanted" },
];

export function FeedFilters({ p, campuses, categories, myCampus }: { p: FeedParams; campuses: Opt[]; categories: Cat[]; myCampus?: string }) {
  const cats = categories.filter((c) => p.tab === "wanted" || c.applies_to === "both" || c.applies_to === (p.tab === "services" ? "service" : "goods"));
  const campusValue = p.campusId ?? "all";
  const tabHref = (tab: Tab) => {
    const sp = new URLSearchParams({ tab, campus: campusValue });
    if (p.q) sp.set("q", p.q);
    return `/?${sp}`;
  };
  const chipHref = (id?: string) => {
    const sp = new URLSearchParams({ tab: p.tab, campus: campusValue });
    if (id) sp.set("category", id);
    return `/?${sp}`;
  };
  const hasFilters = Boolean(p.category || p.min != null || p.max != null);
  const chip = "inline-flex h-10 shrink-0 snap-start items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors";
  return (
    <div className="space-y-4">
      <form action="/" className="space-y-3">
        <input type="hidden" name="tab" value={p.tab} />
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-muted-foreground"><CategoryIcon slug="search" /></span>
          <input type="search" name="q" defaultValue={p.q} aria-label="Search"
            placeholder={p.tab === "wanted" ? "Search wanted ads" : p.tab === "services" ? "Search services" : "Search for anything"}
            className={`${inputCls} h-14 rounded-xl border-2 pl-12 pr-28 text-base shadow-sm`} />
          <button className="absolute right-2 top-2 h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Search</button>
        </div>
        <details open={hasFilters} className="group rounded-lg border border-border bg-card">
          <summary className="flex h-11 cursor-pointer select-none list-none items-center justify-between px-3.5 text-sm font-medium [&::-webkit-details-marker]:hidden">Filters{hasFilters ? " (active)" : ""}<CategoryIcon slug="right" className="h-4 w-4 transition-transform group-open:rotate-90" /></summary>
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
          <div className="flex gap-4 border-t border-border px-3.5">
            <button className="h-11 text-sm font-semibold text-primary hover:underline">Apply filters</button>
            <Link href={`/?tab=${p.tab}`} className="inline-flex h-11 items-center text-sm text-muted-foreground hover:text-foreground">Clear</Link>
          </div>
        </details>
      </form>

      <nav aria-label="Feed" className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <Link key={t.key} href={tabHref(t.key)} aria-current={p.tab === t.key ? "page" : undefined}
            className={`-mb-px flex h-11 items-center border-b-2 px-4 text-sm font-semibold transition-colors ${p.tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4" aria-label="Categories" role="list">
        <Link href={chipHref()} role="listitem" aria-current={!p.category ? "true" : undefined}
          className={`${chip} ${!p.category ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}>All</Link>
        {cats.map((c) => (
          <Link key={c.id} href={chipHref(c.id)} role="listitem" aria-current={p.category === c.id ? "true" : undefined}
            className={`${chip} ${p.category === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}>
            <CategoryIcon slug={c.slug} className="h-4 w-4" />{c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
