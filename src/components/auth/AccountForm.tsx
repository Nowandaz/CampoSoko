"use client";
import { useActionState } from "react";
import { updateProfile } from "@/app/(auth)/actions";

const input = "w-full rounded-xl border border-border bg-card px-4 py-3 text-base outline-none focus:border-primary";

export function AccountForm({ name, whatsapp }: { name: string; whatsapp: string }) {
  const [s, action, pending] = useActionState(updateProfile, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-medium">Full name
        <input name="full_name" defaultValue={name} required className={`${input} mt-1`} />
      </label>
      <label className="block text-sm font-medium">WhatsApp number
        <input name="whatsapp" defaultValue={whatsapp} required className={`${input} mt-1`} />
      </label>
      {s.error && <p role="alert" className="text-sm text-danger">{s.error}</p>}
      {s.notice && <p role="status" className="text-sm text-success">{s.notice}</p>}
      <button disabled={pending} className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
