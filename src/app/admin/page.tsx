import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { BarChart } from "@/components/admin/BarChart";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Overview" };

type Overview = Record<string, number> & { signups: { d: string; n: number }[]; posts: { d: string; n: number }[] };

export default async function Page() {
  const { sb } = await requireAdmin();
  const { data, error } = await sb.rpc("admin_overview");
  if (error || !data) {
    return (
      <>
        <PageTitle title="Overview" />
        <p className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Stats unavailable. Run <code>supabase/run-in-order/9-admin.sql</code> in the Supabase SQL Editor.
        </p>
      </>
    );
  }
  const o = data as Overview;
  const groups: { title: string; items: [string, number, string?][] }[] = [
    { title: "People", items: [["Total users", o.total_users], ["Sellers", o.sellers], ["Buyers", o.buyers], ["Both", o.both], ["New this week", o.new_users_week]] },
    { title: "Marketplace", items: [["Active goods", o.active_goods], ["Active services", o.active_services], ["Wanted ads", o.wanted_ads], ["Receipts issued", o.receipts], ["Deals done", o.deals_done]] },
    { title: "Engagement", items: [["Views (7 days)", o.views_7], ["Views (30 days)", o.views_30], ["WhatsApp clicks (7 days)", o.clicks_7], ["WhatsApp clicks (30 days)", o.clicks_30], ["Open reports", o.open_reports, "/admin/reports"]] },
  ];
  return (
    <div className="space-y-8">
      <PageTitle title="Overview" />
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{g.title}</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {g.items.map(([label, n, href]) => {
              const body = (<><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{n.toLocaleString("en-KE")}</dd></>);
              return href ? <Link key={label} href={href} className="rounded-xl border border-border bg-card p-4 hover:bg-muted/60">{body}</Link>
                          : <div key={label} className="rounded-xl border border-border bg-card p-4">{body}</div>;
            })}
          </dl>
        </section>
      ))}
      <div className="grid gap-4 lg:grid-cols-2">
        <BarChart title="Sign-ups per day" data={o.signups} unit="sign-ups" />
        <BarChart title="New listings per day" data={o.posts} unit="listings" />
      </div>
      <p className="text-xs text-muted-foreground">Buyers are users with at least one wanted ad or WhatsApp contact click. Deals done are listings marked sold.</p>
    </div>
  );
}
