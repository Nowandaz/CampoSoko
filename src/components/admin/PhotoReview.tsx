"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPhotosReviewed, setListingStatus } from "@/app/admin/actions";
import { Spinner } from "@/components/ui/form";
import { X } from "@/components/ui/icons";
import { kes } from "@/lib/format";
import { useFeedback } from "@/components/feedback";

export type ReviewItem = { id: string; title: string; price: number; seller: string; sellerEmail: string; images: string[]; reviewed: boolean };
type Ctx = { open: (item?: ReviewItem) => void; pending: number };
const Ctx = createContext<Ctx>({ open: () => undefined, pending: 0 });
export const usePhotoReview = () => useContext(Ctx);

/** Mounted once in the admin layout. `queue` = listings whose photos still need a look. */
export function PhotoReviewProvider({ queue, children }: { queue: ReviewItem[]; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [item, setItem] = useState<ReviewItem | null>(null);
  const [shot, setShot] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, start] = useTransition();
  const fb = useFeedback();
  const [skipped, setSkipped] = useState<string[]>([]);

  const show = useCallback((it: ReviewItem | null) => {
    setItem(it); setShot(0); setDone(!it);
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const next = (afterId?: string) => {
    const rest = queue.filter((q) => q.id !== afterId && !skipped.includes(q.id));
    show(rest[0] ?? null);
  };
  const open = useCallback((it?: ReviewItem) => { setSkipped([]); show(it ?? queue[0] ?? null); }, [queue, show]);

  // Opening from a notification link: /admin/listings?photos=pending&review=1
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("review") !== "1" || !queue.length) return;
    window.history.replaceState(null, "", window.location.pathname + "?photos=pending");
    const t = setTimeout(() => open(), 0);
    return () => clearTimeout(t);
  }, [open, queue.length]);

  const act = (kind: "ok" | "remove") => {
    if (!item) return;
    const fd = new FormData();
    fd.set("id", item.id);
    if (kind === "remove") fd.set("status", "removed");
    start(async () => {
      try {
        await (kind === "ok" ? markPhotosReviewed(fd) : setListingStatus(fd));
        router.refresh();
        fb.success(kind === "ok" ? "Photos approved" : "Listing removed");
        next(item.id);
      } catch {
        fb.error("Couldn't save that. Check your connection and try again.");
      }
    });
  };

  const pendingCount = queue.filter((q) => !skipped.includes(q.id)).length;
  const position = item && !item.reviewed ? queue.findIndex((q) => q.id === item.id) + 1 : 0;

  return (
    <Ctx.Provider value={{ open, pending: queue.length }}>
      {children}
      <dialog ref={ref} onClose={() => setItem(null)} aria-label="Review photos"
        className="m-auto w-[min(94vw,44rem)] rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/60">
        <div className="max-h-[92vh] overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {item ? (
                <>
                  <p className="text-xs text-muted-foreground">{position ? `Photo review · ${position} of ${queue.length} waiting` : item.reviewed ? "Already reviewed" : "Photo review"}</p>
                  <h2 className="mt-0.5 truncate text-lg font-semibold">{item.title}</h2>
                  <p className="text-sm text-muted-foreground">{kes(item.price)} · {item.seller} ({item.sellerEmail})</p>
                </>
              ) : <h2 className="text-lg font-semibold">Photo review</h2>}
            </div>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-muted"><X /></button>
          </div>

          {item ? (
            <>
              <div className="mt-4 grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-muted">
                {item.images.length ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.images[shot]} alt={`Photo ${shot + 1} of ${item.images.length}`} className="h-full w-full object-contain" />
                ) : <p className="text-sm text-muted-foreground">No photos on this listing</p>}
              </div>
              {item.images.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {item.images.map((u, i) => (
                    <button key={u} type="button" onClick={() => setShot(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === shot}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === shot ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {!item.reviewed && (
                  <button disabled={busy} onClick={() => act("ok")} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
                    {busy && <Spinner />}Photos look fine{pendingCount > 1 ? ", next" : ""}
                  </button>
                )}
                <button disabled={busy} onClick={async () => { if (await fb.confirm({ message: "Remove this listing? It will disappear from the feed.", confirmLabel: "Remove", danger: true })) act("remove"); }} className="h-12 rounded-lg border border-danger/40 px-5 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-60">Remove listing</button>
                {!item.reviewed && pendingCount > 1 && (
                  <button disabled={busy} onClick={() => { setSkipped((s) => [...s, item.id]); next(item.id); }} className="h-12 rounded-lg border border-border px-5 text-sm font-medium hover:bg-muted">Skip</button>
                )}
              </div>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">{done ? "All caught up. No photos are waiting for review." : "Nothing to review."}</p>
          )}
        </div>
      </dialog>
    </Ctx.Provider>
  );
}

export function ReviewQueueButton() {
  const { open, pending } = usePhotoReview();
  if (!pending) return null;
  return (
    <button type="button" onClick={() => open()} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover">
      Review photos <span className="rounded-full bg-white/25 px-1.5 text-xs">{pending}</span>
    </button>
  );
}

export function PhotoThumb({ item }: { item: ReviewItem }) {
  const { open } = usePhotoReview();
  const first = item.images[0];
  return (
    <button type="button" onClick={() => open(item)} aria-label={`View photos of ${item.title}`}
      className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted ring-1 ring-border hover:ring-primary">
      {first ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={first} alt="" className="h-full w-full object-cover" />
      ) : <span className="text-[10px] text-muted-foreground">No photo</span>}
      {item.images.length > 1 && <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[10px] text-white">{item.images.length}</span>}
    </button>
  );
}
