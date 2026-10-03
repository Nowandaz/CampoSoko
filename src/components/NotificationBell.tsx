import { createClient } from "@/lib/supabase/server";
import { BellLive } from "./BellLive";

export async function NotificationBell({ userId }: { userId: string }) {
  const sb = await createClient();
  const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
  return <BellLive initial={count ?? 0} />;
}
