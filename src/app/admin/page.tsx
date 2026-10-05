import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { BarChart } from "@/components/admin/BarChart";
import { Bell, Chat, Store, Tag, User } from "@/components/ui/icons";
import type { ReactNode } from "react";

export const metadata = { title: "Overview" };

type Overview = Record<string, number> & { signups: { d: string; n: number }[]; posts: { d: string; n: number }[] };

function Stat({ label, value, href, hint }: { label: string; value: number; href?: string; hint?: string }) {
  const body = (
    <>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{value.toLocaleString("en-KE")}</dd>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </>
  );
  const cls = "rounded-2xl bg-card p-5 ring-1 ring-border";
  return href ? <Link href={href} className={`${cls} transition-shadow hover:shadow-md`}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Group({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 flex items-center gap-2.5 text-base font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">{icon}</span>{title}
      </h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{children}</dl>
    </section>
  );
}

export default async function Page() {
  const { me, sb } = await requireAdmin();
  const { data, error } = await sb.rpc("admin_overview");
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Nairobi" }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const head = (
    <header className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight">{greeting}, {me.full_name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Here&apos;s how the campus soko is doing.</p>
    </header>
  );
  if (error || !data) {
    return (
      <>
        {head}
        <p className="rounded-2xl bg-danger/10 p-5 text-sm text-danger">Stats are not available yet. Run <code>supabase/run-in-order/9-admin.sql</code> in the Supabase SQL Editor.</p>
      </>
    );
  }
  const o = data as Overview;
  return (
    <div className="space-y-10">
      {head}
      {o.open_reports > 0 && (
        <Link href="/admin/reports" className="flex items-center justify-between gap-3 rounded-2xl bg-primary-soft p-5 ring-1 ring-primary/20 hover:ring-primary/40">
          <span className="flex items-center gap-3"><Bell className="text-primary" /><span><b className="font-semibold">{o.open_reports} report{o.open_reports === 1 ? "" : "s"}</b> waiting for review</span></span>
          <span className="text-sm font-medium text-primary">Review</span>
        </Link>
      )}
      <Group title="People" icon={<User className="h-5 w-5" />}>
        <Stat label="Total users" value={o.total_users} /><Stat label="Sellers" value={o.sellers} /><Stat label="Buyers" value={o.buyers} />
        <Stat label="Both" value={o.both} hint="Buy and sell" /><Stat label="New this week" value={o.new_users_week} />
      </Group>
      <Group title="Marketplace" icon={<Store className="h-5 w-5" />}>
        <Stat label="Active goods" value={o.active_goods} /><Stat label="Active services" value={o.active_services} /><Stat label="Wanted ads" value={o.wanted_ads} />
        <Stat label="Receipts issued" value={o.receipts} href="/admin/receipts" /><Stat label="Deals done" value={o.deals_done} hint="Marked sold" />
      </Group>
      <Group title="Engagement" icon={<Chat className="h-5 w-5" />}>
        <Stat label="Views, 7 days" value={o.views_7} /><Stat label="Views, 30 days" value={o.views_30} />
        <Stat label="WhatsApp clicks, 7 days" value={o.clicks_7} /><Stat label="WhatsApp clicks, 30 days" value={o.clicks_30} />
        <Stat label="Open reports" value={o.open_reports} href="/admin/reports" />
      </Group>
      <section aria-label="Trends" className="space-y-3">
        <h2 className="flex items-center gap-2.5 text-base font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary"><Tag className="h-5 w-5" /></span>Last 30 days</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <BarChart title="Sign-ups per day" data={o.signups} unit="sign-ups" />
          <BarChart title="New listings per day" data={o.posts} unit="listings" />
        </div>
      </section>
      <p className="text-xs text-muted-foreground">Buyers are users with at least one wanted ad or WhatsApp contact click. Deals done are listings marked sold.</p>
    </div>
  );
}
