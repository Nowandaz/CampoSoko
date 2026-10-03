"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Bell, Check, X } from "@/components/ui/icons";

type Kind = "success" | "error" | "info";
type Toast = { id: number; kind: Kind; title: string; body?: string; href?: string };
type ConfirmOpts = { message: string; confirmLabel?: string; danger?: boolean };
type Api = {
  success: (title: string, o?: { body?: string }) => void;
  error: (title: string, o?: { body?: string }) => void;
  info: (title: string, o?: { body?: string; href?: string }) => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
};

const Ctx = createContext<Api | null>(null);
export function useFeedback(): Api {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFeedback must be used inside <FeedbackProvider>");
  return c;
}

const accent = { success: "bg-success", error: "bg-danger", info: "bg-primary" } as const;
const iconCls = { success: "text-success", error: "text-danger", info: "text-primary" } as const;

/** Themed toasts + confirm dialog. Replaces the browser's alert() / confirm() pop-ups. */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const [ask, setAsk] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((kind: Kind, title: string, o?: { body?: string; href?: string }) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-3), { id, kind, title, ...o }]);
    setTimeout(() => dismiss(id), kind === "error" ? 8000 : kind === "info" ? 7000 : 4500);
  }, [dismiss]);

  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => {
    setAsk({ ...o, resolve });
    setTimeout(() => dialog.current?.showModal(), 0);
  }), []);
  const settle = (v: boolean) => { ask?.resolve(v); setAsk(null); dialog.current?.close(); };

  const api = useMemo<Api>(() => ({
    success: (t, o) => push("success", t, o), error: (t, o) => push("error", t, o), info: (t, o) => push("info", t, o), confirm,
  }), [push, confirm]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:inset-x-auto md:bottom-6 md:right-6 md:items-end md:px-0" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} role={t.kind === "error" ? "alert" : "status"}
            className="toast-in pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl bg-card py-3 pl-5 pr-2 shadow-lg ring-1 ring-border">
            <span className={`absolute inset-y-0 left-0 w-1.5 ${accent[t.kind]}`} aria-hidden />
            <span className={`mt-0.5 ${iconCls[t.kind]}`} aria-hidden>{t.kind === "success" ? <Check /> : t.kind === "error" ? <Alert /> : <Bell />}</span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold leading-snug">{t.title}</p>
              {t.body && <p className="mt-0.5 text-muted-foreground">{t.body}</p>}
              {t.href && <Link href={t.href} onClick={() => dismiss(t.id)} className="mt-1 inline-flex h-8 items-center font-semibold text-primary hover:underline">View</Link>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <dialog ref={dialog} onCancel={(e) => { e.preventDefault(); settle(false); }}
        className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/50">
        <div className="p-6">
          <p className="text-base font-semibold leading-snug">{ask?.message}</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => settle(false)} className="h-11 rounded-lg border border-border px-5 text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="button" onClick={() => settle(true)} autoFocus
              className={`h-11 rounded-lg px-5 text-sm font-semibold text-white ${ask?.danger ? "bg-danger hover:opacity-90" : "bg-primary hover:bg-primary-hover"}`}>{ask?.confirmLabel ?? "Confirm"}</button>
          </div>
        </div>
      </dialog>
    </Ctx.Provider>
  );
}

const NOTICES: Record<string, { kind: Kind; title: string; body?: string }> = {
  "admin-only": { kind: "error", title: "That page is for admins only", body: "You're logged in, but your account doesn't have admin access." },
  "login-required": { kind: "info", title: "Please log in to continue" },
  expired: { kind: "info", title: "Your session ended", body: "Log in again to carry on." },
};

/** Shows a one-off themed message from ?notice=key in the URL, then cleans the URL. */
export function FlashToast() {
  const fb = useFeedback();
  useEffect(() => {
    const key = new URL(window.location.href).searchParams.get("notice");
    if (!key || !NOTICES[key]) return;
    // Show first, then clean the URL, so React's dev-mode double effect still shows the message once.
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("notice")) return;
      url.searchParams.delete("notice");
      window.history.replaceState(null, "", url.pathname + (url.search || "") + url.hash);
      const n = NOTICES[key];
      if (n.kind === "error") fb.error(n.title, { body: n.body }); else fb.info(n.title, { body: n.body });
    }, 0);
    return () => clearTimeout(t);
  }, [fb]);
  return null;
}
