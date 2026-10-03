import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/auth/AccountForm";

export const metadata = { title: "My account" };

export default async function Page() {
  const me = await requireMe("/account");
  const sb = await createClient();
  const { data: campus } = await sb.from("campuses").select("name").eq("id", me.campus_id).single();
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-2xl font-extrabold">My account</h1>
      <p className="mb-6 text-sm text-muted-foreground">{me.email} · {campus?.name}</p>
      {me.suspended && <p role="alert" className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">Your account is suspended. You can&apos;t post or contact others.</p>}
      <AccountForm name={me.full_name} whatsapp={me.whatsapp} />
    </div>
  );
}
