import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Bell } from "@/components/ui/icons";

export async function NotificationBell({ userId }: { userId: string }) {
  const sb = await createClient();
  const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
  const n = count ?? 0;
  return (
    <Link href="/notifications" aria-label={n ? `Notifications, ${n} unread` : "Notifications"}
      className="relative grid h-10 w-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      <Bell />
      {n > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">{n > 9 ? "9+" : n}</span>}
    </Link>
  );
}
