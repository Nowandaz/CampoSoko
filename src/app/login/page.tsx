import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { getMe } from "@/lib/auth";
import { safeNext } from "@/lib/validation";

export const metadata = { title: "Log in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getMe()) redirect(next);
  return (
    <AuthShell title="Welcome back" subtitle="Enter your email and we'll send you a one-time login code. No password needed.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
