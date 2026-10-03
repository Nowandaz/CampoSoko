"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell } from "@/components/ui/icons";
import { useFeedback } from "./feedback";

/** Bell with a live unread count. New notifications also appear as a themed toast while the site is open. */
export function BellLive({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  const since = useRef(new Date().toISOString());
  const fb = useFeedback();
  const path = usePathname();

  useEffect(() => {
    let alive = true;
    async function tick() {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`/api/notifications/poll?since=${encodeURIComponent(since.current)}`, { cache: "no-store" });
        if (!r.ok || !alive) return;
        const j = (await r.json()) as { count: number; items: { title: string; body: string | null; link: string | null; created_at: string }[] };
        setCount(j.count);
        for (const n of j.items) fb.info(n.title, { body: n.body ?? undefined, href: n.link ?? "/notifications" });
        if (j.items.length) since.current = j.items[j.items.length - 1].created_at;
      } catch { /* offline: try again next tick */ }
    }
    const id = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    void tick();
    return () => { alive = false; clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [fb, path]);

  return (
    <Link href="/notifications" aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
      className="relative grid h-10 w-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      <Bell />
      {count > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">{count > 9 ? "9+" : count}</span>}
    </Link>
  );
}
