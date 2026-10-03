"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Share, X } from "@/components/ui/icons";
import { APP_NAME } from "@/config/site";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const KEY = "cs_install";
type Saved = { visits: number; dismissed: number; last: number; installed?: boolean };
const read = (): Saved => { try { return { visits: 0, dismissed: 0, last: 0, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return { visits: 0, dismissed: 0, last: 0 }; } };
const write = (s: Saved) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ } };

/**
 * Registers the service worker (production only) and, once someone has come back a couple of times,
 * gently offers to install the site as an app. Android/Chrome/Edge use the native install prompt behind our own
 * button; iPhone/iPad Safari has no install API, so we show the "Add to Home Screen" steps instead.
 */
export function InstallPrompt() {
  const path = usePathname();
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);

    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const saved = read();
    if (!sessionStorage.getItem("cs_counted")) { sessionStorage.setItem("cs_counted", "1"); saved.visits += 1; write(saved); }

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
    const t = setTimeout(() => setIos(isIos), 0);

    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const onInstalled = () => { write({ ...read(), installed: true }); setShow(false); setEvent(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  // Decide when to show: returning visitor, a little time on the page, not dismissed lately.
  useEffect(() => {
    if (!event && !ios) return;
    const s = read();
    const cooldown = 14 * 86_400_000;
    if (s.installed || s.visits < 2 || s.dismissed >= 3 || Date.now() - s.last < cooldown) return;
    const t = setTimeout(() => setShow(true), 20_000);
    return () => clearTimeout(t);
  }, [event, ios, path]);

  const hidden = path.startsWith("/admin") || path.startsWith("/r/") || path.startsWith("/login") || path.startsWith("/signup") || path.startsWith("/set-password");
  if (!show || hidden) return null;

  function dismiss() {
    const s = read();
    write({ ...s, dismissed: s.dismissed + 1, last: Date.now() });
    setShow(false);
  }
  async function install() {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") write({ ...read(), installed: true }); else write({ ...read(), dismissed: read().dismissed + 1, last: Date.now() });
    setShow(false); setEvent(null);
  }

  return (
    <aside aria-label={`Install ${APP_NAME}`} className="toast-in fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl bg-card p-4 shadow-xl ring-1 ring-border md:inset-x-auto md:bottom-6 md:left-6 md:mx-0">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.svg" alt="" width={44} height={44} className="rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">Get the {APP_NAME} app</p>
          {event ? (
            <p className="mt-0.5 text-sm text-muted-foreground">Add it to your home screen for one-tap access and faster loading. No app store needed.</p>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">Tap <Share className="mx-0.5 inline h-4 w-4 align-text-bottom text-primary" /> <b className="font-medium text-foreground">Share</b>, then <b className="font-medium text-foreground">Add to Home Screen</b> to keep it like an app.</p>
          )}
          <div className="mt-3 flex gap-2">
            {event && <button onClick={install} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"><Download className="h-4 w-4" />Install</button>}
            <button onClick={dismiss} className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted">{event ? "Not now" : "Got it"}</button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>
    </aside>
  );
}
