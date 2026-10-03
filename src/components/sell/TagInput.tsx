"use client";
import { useState } from "react";
import { X } from "@/components/ui/icons";
import { inputCls } from "@/components/ui/form";

export function TagInput({ name, initial = [], max = 12, value, onChange }: { name: string; initial?: string[]; max?: number; value?: string[]; onChange?: (t: string[]) => void }) {
  const [inner, setInner] = useState<string[]>(initial);
  const tags = value ?? inner;
  const setTags = (f: string[] | ((p: string[]) => string[])) => {
    const next = typeof f === "function" ? f(tags) : f;
    if (onChange) onChange(next); else setInner(next);
  };
  const [draft, setDraft] = useState("");
  function add(raw: string) {
    const parts = raw.split(",").map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 2 && t.length <= 30);
    if (!parts.length) return;
    setTags((prev) => [...new Set([...prev, ...parts])].slice(0, max));
    setDraft("");
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-1 text-sm font-medium text-primary">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags((x) => x.filter((y) => y !== t))} className="grid h-7 w-7 place-items-center rounded-full hover:bg-primary/10"><X className="h-3.5 w-3.5" /></button>
            <input type="hidden" name={name} value={t} />
          </span>
        ))}
      </div>
      <input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={tags.length >= max}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); } }} onBlur={() => add(draft)}
        placeholder={tags.length >= max ? "Tag limit reached" : "Type a tag and press Enter, e.g. laptops"} maxLength={40} className={`${inputCls} mt-2`} />
    </div>
  );
}
