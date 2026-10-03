"use client";
import { useRef } from "react";
import { CategoryIcon } from "@/components/ui/category-icons";

/** Horizontally scrollable row with snap points; arrows appear on larger screens. */
export function HScroll({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const by = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  const arrow = "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-foreground shadow-md hover:bg-muted md:grid";
  return (
    <div className="group relative">
      <div ref={ref} role="list" aria-label={label} tabIndex={0}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
        {children}
      </div>
      <button type="button" onClick={() => by(-1)} aria-label={`Scroll ${label} left`} className={`${arrow} -left-3`}><CategoryIcon slug="left" /></button>
      <button type="button" onClick={() => by(1)} aria-label={`Scroll ${label} right`} className={`${arrow} -right-3`}><CategoryIcon slug="right" /></button>
    </div>
  );
}
