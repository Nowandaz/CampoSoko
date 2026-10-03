import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { Badge, dangerBtn, PageTitle, smallBtn } from "@/components/admin/ui";
import { setRole, setSuspended } from "@/app/admin/actions";
import { kes, timeAgo } from "@/lib/format";
import { money } from "@/lib/receipts";

export const metadata = { title: "User" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { me, sb } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: u } = await sb.from("profiles").select("id, full_name, email, whatsapp, role, suspended, created_at, campuses(name)").eq("id", id).maybeSingle();
  if (!u) notFound();
  const [{ data: seller }, { data: listings }, { data: wanted }, { data: receipts }, { data: reports }] = await Promise.all([
    sb.from("seller_profiles").select("shop_name, location").eq("user_id", id).maybeSingle(),
    sb.from("listings").select("id, title, price, status, created_at").eq("seller_id", id).order("created_at", { ascending: false }).limit(10),
    sb.from("wanted_ads").select("id, title, status, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    sb.from("receipts").select("id, receipt_no, total, voided, created_at").eq("seller_id", id).order("created_at", { ascending: false }).limit(10),
    sb.from("reports").select("id, reason, status, created_at").eq("reported_user_id", id).order("created_at", { ascending: false }).limit(10),
  ]);
  const self = u.id === me.id;
  const card = "rounded-2xl border border-border bg-card p-4";
  return (
    <div className="space-y-5">
      <PageTitle title={u.full_name}>
        <Link href="/admin/users" className={smallBtn}>All users</Link>
        {!self && (
          <>
            <form action={setSuspended}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="suspended" value={String(!u.suspended)} /><button className={u.suspended ? smallBtn : dangerBtn}>{u.suspended ? "Unsuspend" : "Suspend"}</button></form>
            <form action={setRole}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="role" value={u.role === "admin" ? "user" : "admin"} /><button className={smallBtn}>{u.role === "admin" ? "Remove admin" : "Make admin"}</button></form>
          </>
        )}
      </PageTitle>
      <section className={card}>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{u.email}</dd></div>
          <div><dt className="text-muted-foreground">WhatsApp</dt><dd className="font-medium">{u.whatsapp}</dd></div>
          <div><dt className="text-muted-foreground">Campus</dt><dd className="font-medium">{(u.campuses as unknown as { name: string } | null)?.name}</dd></div>
          <div><dt className="text-muted-foreground">Joined</dt><dd className="font-medium">{timeAgo(u.created_at)}</dd></div>
          <div><dt className="text-muted-foreground">Shop</dt><dd className="font-medium">{seller ? `${seller.shop_name} · ${seller.location}` : "Not a seller yet"}</dd></div>
          <div><dt className="text-muted-foreground">Status</dt><dd className="flex gap-1.5">{u.role === "admin" && <Badge tone="orange">admin</Badge>}{u.suspended ? <Badge tone="red">suspended</Badge> : <Badge tone="green">active</Badge>}</dd></div>
        </dl>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}><h2 className="mb-2 font-semibold">Listings</h2>
          {listings?.length ? <ul className="divide-y divide-border text-sm">{listings.map((l) => <li key={l.id} className="flex justify-between gap-3 py-2"><Link href={`/listing/${l.id}`} className="truncate hover:underline">{l.title}</Link><span className="shrink-0 text-muted-foreground">{kes(l.price)} · {l.status}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">None</p>}</section>
        <section className={card}><h2 className="mb-2 font-semibold">Wanted ads</h2>
          {wanted?.length ? <ul className="divide-y divide-border text-sm">{wanted.map((w) => <li key={w.id} className="flex justify-between gap-3 py-2"><Link href={`/wanted/${w.id}`} className="truncate hover:underline">{w.title}</Link><span className="shrink-0 text-muted-foreground">{w.status}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">None</p>}</section>
        <section className={card}><h2 className="mb-2 font-semibold">Receipts issued</h2>
          {receipts?.length ? <ul className="divide-y divide-border text-sm">{receipts.map((r) => <li key={r.id} className="flex justify-between gap-3 py-2"><Link href={`/receipts/${r.id}`} className="font-mono hover:underline">{r.receipt_no}</Link><span className={`text-muted-foreground ${r.voided ? "line-through" : ""}`}>{money(r.total)}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">None</p>}</section>
        <section className={card}><h2 className="mb-2 font-semibold">Reports against this user</h2>
          {reports?.length ? <ul className="divide-y divide-border text-sm">{reports.map((r) => <li key={r.id} className="py-2"><span className="text-muted-foreground">{r.status} · {timeAgo(r.created_at)}</span><br />{r.reason}</li>)}</ul> : <p className="text-sm text-muted-foreground">None</p>}</section>
      </div>
    </div>
  );
}
