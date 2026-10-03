import { requireAdmin } from "@/lib/admin";
import { Badge, PageTitle, smallBtn } from "@/components/admin/ui";
import { CampusForm } from "@/components/admin/AdminForms";
import { setCampusActive } from "@/app/admin/actions";
import { ActionForm } from "@/components/ActionForm";

export const metadata = { title: "Campuses" };

export default async function Page() {
  const { sb } = await requireAdmin();
  const { data } = await sb.from("campuses").select("id, name, county, email_domain, active").order("name");
  return (
    <>
      <PageTitle title="Campuses" />
      <p className="mb-4 text-sm text-muted-foreground">These appear in the sign-up dropdown. If an email domain is set (for example <code>uonbi.ac.ke</code>), students must sign up with a matching email. Leave it empty to allow any email.</p>
      <section className="mb-6 rounded-2xl border border-border bg-card p-4"><h2 className="mb-3 text-sm font-semibold">Add a campus</h2><CampusForm /></section>
      <ul className="space-y-3">
        {(data ?? []).map((c) => (
          <li key={c.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2"><Badge tone={c.active ? "green" : "gray"}>{c.active ? "active" : "inactive"}</Badge>
              <ActionForm action={setCampusActive} success="Saved"><input type="hidden" name="id" value={c.id} /><input type="hidden" name="active" value={String(!c.active)} /><button className={smallBtn}>{c.active ? "Deactivate" : "Activate"}</button></ActionForm></div>
            <CampusForm c={c} />
          </li>
        ))}
      </ul>
    </>
  );
}
