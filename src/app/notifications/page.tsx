import Link from "next/link";
import { after } from "next/server";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Notifications" };

export default async function Page() {
  const me = await requireMe("/notifications");
  const sb = await createClient();
  const { data } = await sb.from("notifications").select("id, title, body, link, read_at, created_at")
    .eq("user_id", me.id).order("created_at", { ascending: false }).limit(50);
  after(async () => {
    const s = await createClient();
    await s.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", me.id).is("read_at", null);
  });
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
      {!data?.length ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <p className="font-semibold">Nothing yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Post a wanted ad with alerts on and we will tell you when a matching listing appears.</p>
          <Link href="/wanted/new" className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Post a wanted ad</Link>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {data.map((n) => (
            <li key={n.id}>
              <Link href={n.link ?? "/"} className={`flex gap-3 p-4 hover:bg-muted/60 ${n.read_at ? "" : "bg-primary-soft"}`}>
                <span aria-hidden className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`} />
                <span className="min-w-0">
                  <span className="block font-medium">{n.title}</span>
                  {n.body && <span className="block text-sm text-muted-foreground">{n.body}</span>}
                  <span className="mt-1 block text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
