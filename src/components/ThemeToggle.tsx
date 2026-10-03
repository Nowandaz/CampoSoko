"use client";
import { useSyncExternalStore } from "react";

const root = () => document.documentElement;
function subscribe(cb: () => void) {
  const o = new MutationObserver(cb);
  o.observe(root(), { attributes: true, attributeFilter: ["data-theme"] });
  return () => o.disconnect();
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, () => root().dataset.theme === "dark", () => false);
  function toggle() {
    if (dark) delete root().dataset.theme;
    else root().dataset.theme = "dark";
    try { localStorage.setItem("theme", dark ? "light" : "dark"); } catch {}
  }
  return (
    <button onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="h-10 w-10 rounded-full border border-border grid place-items-center hover:bg-muted">
      <span aria-hidden>{dark ? "☀️" : "🌙"}</span>
    </button>
  );
}
