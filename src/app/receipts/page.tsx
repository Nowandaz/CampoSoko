import Link from "next/link";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/receipts";

export const metadata = { title: "Receipts" };

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const me = await requireMe("/receipts");
  const purchases = (await searchParams).view === "purchases";
  const sb = await createClient();
  const q = sb.from("receipts").select("id, receipt_no, buyer_name, total, sale_date, voided, seller_id").order("created_at", { ascending: false }).limit(100);
  const { data } = await (purchases ? q.eq("buyer_id", me.id) : q.eq("seller_id", me.id));
  const sellerIds = [...new Set((data ?? []).map((r) => r.seller_id))];
  const { data: sellers } = purchases && sellerIds.length ? await sb.from("seller_profiles").select("user_id, shop_name").in("user_id", sellerIds) : { data: [] };
  const shop = new Map((sellers ?? []).map((s) => [s.user_id, s.shop_name]));
  const tab = (active: boolean) => `flex h-11 items-center border-b-2 px-4 text-sm font-semibold ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Receipts</h1>
        <Link href="/receipts/new" className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">New receipt</Link>
      </div>
      <nav aria-label="Receipts" className="flex gap-1 border-b border-border">
        <Link href="/receipts" className={tab(!purchases)} aria-current={!purchases ? "page" : undefined}>My sales</Link>
        <Link href="/receipts?view=purchases" className={tab(purchases)} aria-current={purchases ? "page" : undefined}>My purchases</Link>
      </nav>
      {!data?.length ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <p className="font-semibold">{purchases ? "No purchases yet" : "No receipts yet"}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {purchases ? "When a seller issues a receipt using your phone number or email, it will appear here." : "After a sale, issue a receipt so you and the buyer have a record."}
          </p>
          {!purchases && <Link href="/receipts/new" className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Issue a receipt</Link>}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {data.map((r) => (
            <li key={r.id}>
              <Link href={`/receipts/${r.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/60">
                <span className="min-w-0">
                  <span className="block font-mono text-sm font-semibold">{r.receipt_no}</span>
                  <span className="block truncate text-sm text-muted-foreground">{purchases ? shop.get(r.seller_id) ?? "Seller" : r.buyer_name} · {new Date(r.sale_date + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`block font-semibold tabular-nums ${r.voided ? "line-through opacity-60" : ""}`}>{money(r.total)}</span>
                  {r.voided && <span className="text-xs font-medium text-danger">VOID</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
