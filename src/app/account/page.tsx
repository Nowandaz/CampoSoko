import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/auth/AccountForm";
import { Notice } from "@/components/ui/form";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { PasswordForm } from "@/components/auth/PasswordForm";

export const metadata = { title: "My account" };

function previewName(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

export default async function Page() {
  const me = await requireMe("/account");
  const sb = await createClient();
  const { data: prof } = await sb.from("profiles").select("display_name").eq("id", me.id).maybeSingle();
  const { data: campus } = await sb.from("campuses").select("name").eq("id", me.campus_id).single();
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold tracking-tight">My account</h1>
      <dl className="mb-6 mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-xl border border-border bg-muted/50 p-4 text-sm">
        <dt className="text-muted-foreground">Email</dt><dd className="font-medium">{me.email}</dd>
        <dt className="text-muted-foreground">Campus</dt><dd className="font-medium">{campus?.name}</dd>
      </dl>
      {me.suspended && <div className="mb-4"><Notice error="Your account is suspended. You can't post or contact others." /></div>}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm"><AccountForm name={me.full_name} whatsapp={me.whatsapp} displayName={prof?.display_name ?? ""} publicPreview={previewName(me.full_name)} /></section>
      <section id="password" className="mt-6 scroll-mt-20 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Password</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Change the password you use to log in.</p>
        <PasswordForm />
      </section>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {me.role === "admin" && <Link href="/admin" className="inline-flex h-12 flex-1 items-center justify-center rounded-lg border border-border font-semibold hover:bg-muted">Admin dashboard</Link>}
        <form action={logout} className="flex-1"><button className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-border font-semibold text-danger hover:bg-muted">Log out</button></form>
      </div>
    </div>
  );
}
