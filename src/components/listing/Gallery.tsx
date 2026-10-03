"use client";
import { useState } from "react";

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="grid aspect-[4/3] place-items-center rounded-xl bg-muted text-sm text-muted-foreground">No photos</div>;
  return (
    <div>
      <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i]} alt={`${title}, photo ${i + 1} of ${images.length}`} className="h-full w-full object-contain" />
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {images.map((u, n) => (
            <button key={u} onClick={() => setI(n)} aria-label={`Show photo ${n + 1}`} aria-current={n === i}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${n === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
