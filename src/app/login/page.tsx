import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/AuthForm";
import { getMe } from "@/lib/auth";
import { safeNext } from "@/lib/validation";

export const metadata = { title: "Log in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getMe()) redirect(next);
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-extrabold">Welcome back</h1>
      <p className="mb-6 mt-1 text-muted-foreground">We&apos;ll email you a login code. No password needed.</p>
      <LoginForm next={next} />
    </div>
  );
}
