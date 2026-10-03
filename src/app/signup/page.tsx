import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/AuthForm";
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
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-extrabold">Join your campus soko</h1>
      <p className="mb-6 mt-1 text-muted-foreground">Buy, sell and request things from students near you.</p>
      <SignupForm campuses={data ?? []} next={next} />
    </div>
  );
}
