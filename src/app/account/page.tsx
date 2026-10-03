import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/auth/AccountForm";
import { Notice } from "@/components/ui/form";
import { PasswordForm } from "@/components/auth/PasswordForm";

export const metadata = { title: "My account" };

export default async function Page() {
  const me = await requireMe("/account");
  const sb = await createClient();
  const { data: campus } = await sb.from("campuses").select("name").eq("id", me.campus_id).single();
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold tracking-tight">My account</h1>
      <dl className="mb-6 mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-xl border border-border bg-muted/50 p-4 text-sm">
        <dt className="text-muted-foreground">Email</dt><dd className="font-medium">{me.email}</dd>
        <dt className="text-muted-foreground">Campus</dt><dd className="font-medium">{campus?.name}</dd>
      </dl>
      {me.suspended && <div className="mb-4"><Notice error="Your account is suspended. You can't post or contact others." /></div>}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm"><AccountForm name={me.full_name} whatsapp={me.whatsapp} /></section>
      <section id="password" className="mt-6 scroll-mt-20 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Password</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Optional. Set a password to log in without waiting for an email code. You can always use an email code instead.</p>
        <PasswordForm />
      </section>
    </div>
  );
}
