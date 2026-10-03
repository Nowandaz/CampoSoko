import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";

export const metadata = { title: "Create account" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getMe()) redirect(next);
  const sb = await createClient();
  const { data } = await sb.from("campuses").select("id, name").eq("active", true).order("name");
  return (
    <AuthShell title="Create your account" subtitle="Free for every student. We'll verify your email with a one-time code.">
      <SignupForm campuses={data ?? []} next={next} />
    </AuthShell>
  );
}
