import { redirect } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// "Start selling" entry point: seller profile first, then the listing form.
export default async function Page() {
  const me = await requireMe("/sell");
  const sb = await createClient();
  const { data } = await sb.from("seller_profiles").select("user_id").eq("user_id", me.id).maybeSingle();
  redirect(data ? "/sell/new" : "/sell/profile");
}
