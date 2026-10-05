"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/images";
import { MAX_IMAGES } from "@/config/site";
import { X } from "@/components/ui/icons";

type Props = {
  userId: string;
  bucket: "listing-images" | "avatars";
  initial?: string[];
  max?: number;
  name: string; // hidden input name; one input per image URL
  label: string;
  hint?: string;
};

export function ImageUploader({ userId, bucket, initial = [], max = MAX_IMAGES, name, label, hint }: Props) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const room = max - urls.length;
    const picked = Array.from(files).slice(0, Math.max(room, 0));
    if (files.length > room) setError(`You can add up to ${max} images.`);
    const sb = createClient();
    for (const f of picked) {
      setBusy((b) => b + 1);
      try {
        const blob = await compressImage(f);
        const path = `${userId}/${crypto.randomUUID()}.webp`;
        const { error: e } = await sb.storage.from(bucket).upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
        if (e) throw new Error("Upload failed. Check your connection and try again.");
        const { data } = sb.storage.from(bucket).getPublicUrl(path);
        setUrls((u) => (max === 1 ? [data.publicUrl] : [...u, data.publicUrl]));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setBusy((b) => b - 1);
      }
    }
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-3">
        {urls.map((u, i) => (
          <div key={u} className="relative h-24 w-24 overflow-hidden rounded-lg border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && max > 1 && <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[10px] font-medium text-white">Cover</span>}
            <button type="button" onClick={() => setUrls((x) => x.filter((y) => y !== u))} aria-label={`Remove image ${i + 1}`}
              className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/65 text-white hover:bg-black"><X className="h-3.5 w-3.5" /></button>
            <input type="hidden" name={name} value={u} />
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => (
          <div key={`b${i}`} className="grid h-24 w-24 place-items-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">Uploading</div>
        ))}
        {(max === 1 ? urls.length === 0 : urls.length + busy < max) && (
          <button type="button" onClick={() => input.current?.click()}
            className="grid h-24 w-24 place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            + Add
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={max > 1} hidden onChange={(e) => onFiles(e.target.files)} />
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      {error && <p role="alert" className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}
