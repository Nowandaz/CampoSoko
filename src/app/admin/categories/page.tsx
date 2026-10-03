import { requireAdmin } from "@/lib/admin";
import { Badge, PageTitle, smallBtn } from "@/components/admin/ui";
import { CategoryForm } from "@/components/admin/AdminForms";
import { setCategoryActive } from "@/app/admin/actions";

export const metadata = { title: "Categories" };

export default async function Page() {
  const { sb } = await requireAdmin();
  const { data } = await sb.from("categories").select("id, name, slug, applies_to, sort_order, active").order("sort_order");
  return (
    <>
      <PageTitle title="Categories" />
      <p className="mb-4 text-sm text-muted-foreground">The slug picks the icon shown in the feed (electronics, books, clothes, furniture, food, services-design, services-video, services-writing, tutoring, other). New slugs get a generic icon.</p>
      <section className="mb-6 rounded-2xl border border-border bg-card p-4"><h2 className="mb-3 text-sm font-semibold">Add a category</h2><CategoryForm /></section>
      <ul className="space-y-3">
        {(data ?? []).map((c) => (
          <li key={c.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2"><Badge tone={c.active ? "green" : "gray"}>{c.active ? "active" : "inactive"}</Badge>
              <form action={setCategoryActive}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="active" value={String(!c.active)} /><button className={smallBtn}>{c.active ? "Deactivate" : "Activate"}</button></form></div>
            <CategoryForm c={c} />
          </li>
        ))}
      </ul>
    </>
  );
}
