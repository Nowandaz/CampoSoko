"use client";
import { useActionState } from "react";
import { saveSellerProfile } from "@/app/sell/actions";
import { Field, Notice, Spinner, btnPrimary, inputCls } from "@/components/ui/form";
import { ImageUploader } from "./ImageUploader";

type Initial = { shop_name: string; location: string; description: string; avatar_url: string | null };

export function SellerProfileForm({ userId, initial, next }: { userId: string; initial?: Initial; next: string }) {
  const [s, action, pending] = useActionState(saveSellerProfile, {});
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <Field label="Shop or display name">
        <input name="shop_name" defaultValue={initial?.shop_name} required minLength={2} maxLength={60} placeholder="e.g. Amina's Tech Corner" className={inputCls} />
      </Field>
      <Field label="Location on campus" hint="Hostel, block or area where buyers can find you.">
        <input name="location" defaultValue={initial?.location} required minLength={2} maxLength={100} placeholder="e.g. Hall 4, Block B" className={inputCls} />
      </Field>
      <Field label="About your shop" hint="At least 20 characters. Tell buyers what you sell or offer.">
        <textarea name="description" defaultValue={initial?.description} required minLength={20} maxLength={600} rows={4} className={`${inputCls} h-auto py-3`} />
      </Field>
      <ImageUploader userId={userId} bucket="avatars" max={1} name="avatar" label="Profile photo (optional)"
        initial={initial?.avatar_url ? [initial.avatar_url] : []} />
      <Notice error={s.error} />
      <button className={btnPrimary} disabled={pending}>{pending && <Spinner />}{pending ? "Saving" : initial ? "Save changes" : "Save and continue"}</button>
    </form>
  );
}
