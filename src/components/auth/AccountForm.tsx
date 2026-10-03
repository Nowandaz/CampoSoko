"use client";
import { useSafeForm } from "@/lib/use-safe-form";

import { updateProfile } from "@/app/(auth)/actions";
import { Field, Notice, Spinner, btnPrimary, inputCls } from "@/components/ui/form";

export function AccountForm({ name, whatsapp, displayName, publicPreview }: { name: string; whatsapp: string; displayName: string; publicPreview: string }) {
  const [s, action, pending] = useSafeForm(updateProfile, {});
  return (
    <form onSubmit={action} className="space-y-4">
      <Field label="Full name"><input name="full_name" defaultValue={name} required className={inputCls} /></Field>
      <Field label="Public name (optional)" hint={`Shown on wanted ads and when you have no shop name. Leave blank to show "${publicPreview}". Your full name stays private.`}>
        <input name="display_name" defaultValue={displayName} maxLength={30} className={inputCls} />
      </Field>
      <Field label="WhatsApp number" hint="Shown only to logged-in users who contact you.">
        <input name="whatsapp" defaultValue={whatsapp} required className={inputCls} />
      </Field>
      <Notice error={s.error} notice={s.notice} />
      <button disabled={pending} className={btnPrimary}>{pending && <Spinner />}{pending ? "Saving" : "Save changes"}</button>
    </form>
  );
}
