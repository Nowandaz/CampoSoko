"use client";
import { useSafeForm } from "@/lib/use-safe-form";

import { setPassword } from "@/app/(auth)/actions";
import { Field, Notice, Spinner, btnPrimary } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/PasswordInput";

export function PasswordForm({ next }: { next?: string }) {
  const [s, action, pending] = useSafeForm(setPassword, {});
  return (
    <form onSubmit={action} className="space-y-4">
      {next && <><input type="hidden" name="redirect" value="1" /><input type="hidden" name="next" value={next} /></>}
      <Field label="New password" hint="At least 8 characters."><PasswordInput name="password" autoComplete="new-password" minLength={8} /></Field>
      <Field label="Confirm password"><PasswordInput name="confirm" autoComplete="new-password" minLength={8} /></Field>
      <Notice error={s.error} notice={s.notice} />
      <button className={btnPrimary} disabled={pending}>{pending && <Spinner />}{pending ? "Saving" : "Save password"}</button>
    </form>
  );
}
