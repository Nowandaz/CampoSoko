import Link from "next/link";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteListing, markSold, renewListing } from "@/app/sell/actions";
import { ConfirmButton } from "@/components/sell/ConfirmButton";
import { Notice } from "@/components/ui/form";
import { closeWanted, deleteWanted } from "@/app/wanted/actions";

export const metadata = { title: "My dashboard" };

const statusStyle: Record<string, string> = {
  active: "bg-success/10 text-success",
  sold: "bg-muted text-muted-foreground",
  expired: "bg-danger/10 text-danger",
  removed: "bg-danger/10 text-danger",
};
const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
const small = "inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted";
const kes = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

export default async function Page({ searchParams }: { searchParams: Promise<{ posted?: string; saved?: string; wanted?: string }> }) {
  const q = await searchParams;
  const me = await requireMe("/dashboard");
  const sb = await createClient();
  const [{ data: seller }, { data: listings }, { data: stats }, { data: wanted }] = await Promise.all([
    sb.from("seller_profiles").select("shop_name").eq("user_id", me.id).maybeSingle(),
    sb.from("listings").select("id, type, title, price, status, quantity, expires_at, created_at, listing_images(url, position)")
      .eq("seller_id", me.id).order("created_at", { ascending: false }),
    sb.rpc("seller_listing_stats"),
    sb.from("wanted_ads").select("id, title, status, notify, budget, created_at").eq("user_id", me.id).order("created_at", { ascending: false }),
  ]);
  type Stat = { listing_id: string; views: number; contact_clicks: number };
  const byId = new Map<string, Stat>(((stats ?? []) as Stat[]).map((s) => [s.listing_id, s]));
  let totalViews = 0;
  let totalClicks = 0;
  byId.forEach((s) => { totalViews += Number(s.views); totalClicks += Number(s.contact_clicks); });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{seller?.shop_name ?? "Dashboard"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your listings and see how they perform.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sell/profile" className={small}>Seller profile</Link>
          <Link href="/sell" className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">New listing</Link>
        </div>
      </div>

      {q.posted && <Notice notice="Your listing is live." />}
      {q.saved && <Notice notice="Changes saved." />}
      {q.wanted && <Notice notice="Your wanted ad is live." />}

      <dl className="grid grid-cols-3 gap-3">
        {[["Listings", listings?.length ?? 0], ["Views", totalViews], ["WhatsApp clicks", totalClicks]].map(([label, n]) => (
          <div key={label as string} className="rounded-xl border border-border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>

      {!listings?.length ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-medium">No listings yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Post your first item or service. It takes about a minute.</p>
          <Link href="/sell" className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Create a listing</Link>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {listings.map((l) => {
            const img = [...(l.listing_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url;
            const s = byId.get(l.id);
            const daysLeft = daysUntil(l.expires_at);
            const canRenew = l.status === "expired" || (l.status === "active" && daysLeft <= 7);
            return (
              <li key={l.id} className="flex flex-col gap-4 p-4 sm:flex-row">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/listing/${l.id}`} className="truncate font-semibold hover:underline">{l.title}</Link>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyle[l.status]}`}>{l.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {kes.format(Number(l.price))} · {l.type === "goods" ? `${l.quantity} in stock` : "Service"}
                    {l.status === "active" && ` · expires in ${Math.max(daysLeft, 0)} day${daysLeft === 1 ? "" : "s"}`}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">{Number(s?.views ?? 0)} views · {Number(s?.contact_clicks ?? 0)} WhatsApp clicks</p>
                  {l.status !== "removed" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/sell/${l.id}/edit`} className={small}>Edit</Link>
                      {l.status === "active" && (
                        <form action={markSold}><input type="hidden" name="id" value={l.id} />
                          <ConfirmButton message="Mark this listing as sold?" className={small}>{l.type === "goods" ? "Mark sold" : "Mark done"}</ConfirmButton></form>
                      )}
                      {canRenew && (
                        <form action={renewListing}><input type="hidden" name="id" value={l.id} /><button className={small}>Renew 30 days</button></form>
                      )}
                      <form action={deleteListing}><input type="hidden" name="id" value={l.id} />
                        <ConfirmButton message="Delete this listing permanently?" className={`${small} text-danger`}>Delete</ConfirmButton></form>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="space-y-3" aria-labelledby="my-wanted">
        <div className="flex items-center justify-between">
          <h2 id="my-wanted" className="text-lg font-semibold">My wanted ads</h2>
          <Link href="/wanted/new" className={small}>Post a wanted ad</Link>
        </div>
        {!wanted?.length ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">You have no wanted ads. Post one and get alerted when a match appears.</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {wanted.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link href={`/wanted/${w.id}`} className="font-medium hover:underline">{w.title}</Link>
                  <p className="text-xs text-muted-foreground capitalize">{w.status === "fulfilled" ? "closed" : w.status}{w.notify ? " · alerts on" : ""}</p>
                </div>
                <div className="flex gap-2">
                  {w.status === "active" && (
                    <form action={closeWanted}><input type="hidden" name="id" value={w.id} />
                      <ConfirmButton message="Close this ad? It will stop appearing in the feed." className={small}>Found it</ConfirmButton></form>
                  )}
                  <form action={deleteWanted}><input type="hidden" name="id" value={w.id} />
                    <ConfirmButton message="Delete this wanted ad?" className={`${small} text-danger`}>Delete</ConfirmButton></form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
