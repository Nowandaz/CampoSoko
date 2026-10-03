"use client";
import { useState } from "react";
import { revealContact } from "@/app/listing/actions";
import { Spinner } from "@/components/ui/form";

const primary = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#16a34a] px-5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-[#15803d] disabled:opacity-60";

export function ContactButton({ listingId }: { listingId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tips, setTips] = useState(false);
  function start() {
    let seen = false;
    try { seen = sessionStorage.getItem("cs_tips") === "1"; } catch {}
    if (seen) return go();
    setTips(true);
  }
  async function go() {
    try { sessionStorage.setItem("cs_tips", "1"); } catch {}
    setTips(false);
    setBusy(true); setError("");
    // Open the tab synchronously so mobile browsers don't treat it as a blocked popup.
    const win = window.open("", "_blank");
    const res = await revealContact(listingId);
    setBusy(false);
    if (res.url) {
      if (win) { win.opener = null; win.location.href = res.url; } else window.location.href = res.url;
    } else {
      win?.close();
      setError(res.error ?? "Something went wrong.");
    }
  }
  return (
    <div>
      {tips ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm" role="dialog" aria-label="Before you message">
          <p className="font-semibold">Before you message</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Meet in public campus spots like the library, cafeteria or main gate.</li>
            <li>Bring a friend, and inspect the item before you pay.</li>
            <li>Never pay in full upfront to a stranger. Never share your M-Pesa PIN or OTP.</li>
            <li>After paying, ask for a CampoSoko receipt and leave a review.</li>
          </ul>
          <div className="flex gap-2">
            <button onClick={go} className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-[#16a34a] px-4 font-semibold text-white hover:bg-[#15803d]">Continue to WhatsApp</button>
            <button onClick={() => setTips(false)} className="h-11 rounded-lg border border-border px-4 font-medium hover:bg-muted">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={start} disabled={busy} className={primary}>{busy && <Spinner />}Message on WhatsApp</button>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
