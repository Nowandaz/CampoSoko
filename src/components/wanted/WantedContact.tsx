"use client";
import { useState } from "react";
import { revealWantedContact } from "@/app/wanted/actions";
import { Spinner } from "@/components/ui/form";

export function WantedContact({ wantedId }: { wantedId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    setBusy(true); setError("");
    const win = window.open("", "_blank");
    const res = await revealWantedContact(wantedId);
    setBusy(false);
    if (res.url) { if (win) { win.opener = null; win.location.href = res.url; } else window.location.href = res.url; }
    else { win?.close(); setError(res.error ?? "Something went wrong."); }
  }
  return (
    <div>
      <button onClick={go} disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#16a34a] px-5 text-[15px] font-semibold text-white shadow-sm hover:bg-[#15803d] disabled:opacity-60">
        {busy && <Spinner />}Contact buyer on WhatsApp
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
