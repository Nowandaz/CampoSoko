import { requireMe } from "@/lib/auth";
import { safeNext } from "@/lib/validation";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordForm } from "@/components/auth/PasswordForm";

export const metadata = { title: "Set your password" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await requireMe("/set-password");
  const next = safeNext((await searchParams).next);
  return (
    <AuthShell title="Choose a password" subtitle="Your email is verified. Set a password and use it to log in from now on. You will only need email codes if you forget it.">
      <PasswordForm next={next} />
    </AuthShell>
  );
}
