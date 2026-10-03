import Link from "next/link";
import { likeSafe, PAGE, requireAdmin } from "@/lib/admin";
import { DownloadLink, Badge, dangerBtn, PageTitle, Pager, selectCls, smallBtn, Table, td, th } from "@/components/admin/ui";
import { markPhotosReviewed, setListingStatus, toggleFeatured } from "@/app/admin/actions";
import { kes, timeAgo } from "@/lib/format";
import { inputCls } from "@/components/ui/form";

export const metadata = { title: "Listings" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ data: campuses }] = await Promise.all([sb.from("campuses").select("id, name").order("name")]);
  let q = sb.from("listings")
    .select("id, title, type, price, status, featured, created_at, expires_at, photos_reviewed, profiles(full_name, email), campuses(name)", { count: "exact" });
  if (sp.q && likeSafe(sp.q)) q = q.ilike("title", `%${likeSafe(sp.q)}%`);
  if (sp.status && ["active", "sold", "expired", "removed"].includes(sp.status)) q = q.eq("status", sp.status);
  if (sp.photos === "pending") {
    const { data: pend } = await sb.from("listings").select("id, listing_images!inner(id)").eq("photos_reviewed", false).eq("status", "active").limit(500);
    q = q.in("id", (pend ?? []).length ? (pend ?? []).map((x) => x.id) : ["00000000-0000-0000-0000-000000000000"]);
  }
  if (sp.type === "goods" || sp.type === "service") q = q.eq("type", sp.type);
  if (sp.campus && /^[0-9a-f-]{36}$/.test(sp.campus)) q = q.eq("campus_id", sp.campus);
  const { data, count } = await q.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const ids = (data ?? []).map((l) => l.id);
  const { data: stats } = ids.length ? await sb.rpc("admin_listing_stats", { p_ids: ids }) : { data: [] };
  type LS = { listing_id: string; views: number; clicks: number; reports: number };
  const st = new Map<string, LS>(((stats ?? []) as LS[]).map((s) => [s.listing_id, s]));
  const href = (p: number) => { const u = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]); u.set("page", String(p)); return `/admin/listings?${u}`; };
  const tone = { active: "green", sold: "gray", expired: "orange", removed: "red" } as const;

  return (
    <>
      <PageTitle title="Listings">
        <DownloadLink href="/admin/export/listings">Export CSV</DownloadLink>
        <Link href="/admin/listings/new" className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Add for a user</Link>
      </PageTitle>
      <form className="mb-4 flex flex-wrap gap-2">
        <div className="w-full sm:w-64"><input name="q" defaultValue={sp.q} placeholder="Search titles" className={`${inputCls} h-10`} /></div>
        <select name="status" defaultValue={sp.status ?? ""} className={selectCls}><option value="">Any status</option>{["active", "sold", "expired", "removed"].map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select name="type" defaultValue={sp.type ?? ""} className={selectCls}><option value="">Goods and services</option><option value="goods">Goods</option><option value="service">Services</option></select>
        <select name="campus" defaultValue={sp.campus ?? ""} className={selectCls}><option value="">All campuses</option>{(campuses ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="photos" defaultValue={sp.photos ?? ""} className={selectCls}><option value="">Any photos</option><option value="pending">Photos to review</option></select>
        <button className={smallBtn}>Filter</button>
      </form>
      <Table min="60rem">
        <thead><tr className="border-b border-border"><th className={th}>Listing</th><th className={th}>Seller</th><th className={th}>Status</th><th className={th}>Views</th><th className={th}>Clicks</th><th className={th}>Reports</th><th className={th}>Actions</th></tr></thead>
        <tbody className="divide-y divide-border">
          {(data ?? []).map((l) => {
            const s = st.get(l.id);
            const seller = l.profiles as unknown as { full_name: string; email: string } | null;
            return (
              <tr key={l.id}>
                <td className={td}>
                  <Link href={`/listing/${l.id}`} className="font-medium hover:underline">{l.title}</Link>
                  <div className="text-xs text-muted-foreground">{l.type === "goods" ? "Goods" : "Service"} · {kes(l.price)} · {(l.campuses as unknown as { name: string } | null)?.name} · {timeAgo(l.created_at)}</div>
                </td>
                <td className={td}>{seller?.full_name}<div className="text-xs text-muted-foreground">{seller?.email}</div></td>
                <td className={td}><Badge tone={tone[l.status as keyof typeof tone]}>{l.status}</Badge>{!l.photos_reviewed && l.status === "active" && <span className="ml-1"><Badge tone="orange">photos to review</Badge></span>}{l.featured && <span className="ml-1"><Badge tone="orange">featured</Badge></span>}</td>
                <td className={`${td} tabular-nums`}>{Number(s?.views ?? 0)}</td>
                <td className={`${td} tabular-nums`}>{Number(s?.clicks ?? 0)}</td>
                <td className={`${td} tabular-nums`}>{Number(s?.reports ?? 0) > 0 ? <Badge tone="red">{Number(s?.reports)}</Badge> : 0}</td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1.5">
                    {!l.photos_reviewed && l.status === "active" && <form action={markPhotosReviewed}><input type="hidden" name="id" value={l.id} /><button className={smallBtn}>Photos OK</button></form>}
                    <Link href={`/admin/listings/${l.id}/edit`} className={smallBtn}>Edit</Link>
                    <form action={toggleFeatured}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="featured" value={String(!l.featured)} /><button className={smallBtn}>{l.featured ? "Unfeature" : "Feature"}</button></form>
                    {l.status === "removed"
                      ? <form action={setListingStatus}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="status" value="active" /><button className={smallBtn}>Restore</button></form>
                      : <form action={setListingStatus}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="status" value="removed" /><button className={dangerBtn}>Remove</button></form>}
                  </div>
                </td>
              </tr>
            );
          })}
          {!data?.length && <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">No listings match.</td></tr>}
        </tbody>
      </Table>
      <Pager page={page} total={count ?? 0} size={PAGE} href={href} />
    </>
  );
}
