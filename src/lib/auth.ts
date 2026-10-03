import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";

export type Me = {
  id: string; full_name: string; email: string; whatsapp: string;
  campus_id: string; role: "user" | "admin"; suspended: boolean;
};

export const getMe = cache(async (): Promise<Me | null> => {
  if (!supabaseConfigured()) return null;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("profiles")
    .select("id, full_name, email, whatsapp, campus_id, role, suspended").eq("id", user.id).single();
  return data as Me | null;
});

export async function requireMe(next = "/") {
  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(next)}`);
  return me;
}
