"use client";
import { useState } from "react";
import { useSafeForm } from "@/lib/use-safe-form";
import { submitReview } from "@/app/reviews/actions";
import { Notice, Spinner, inputCls } from "@/components/ui/form";
import { ThumbDown, ThumbUp } from "@/components/ui/icons";

type Existing = { positive: boolean; comment: string | null } | null;

export function ReviewBox({ token, seller, existing }: { token: string; seller: string; existing: Existing }) {
  const [rating, setRating] = useState<"up" | "down" | "">("");
  const [state, onSubmit, pending] = useSafeForm(submitReview, {});
  const done = existing ?? (state.notice ? { positive: state.done === "up", comment: null } : null);
  if (done) {
    return (
      <section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4" aria-label="Review">
        {done.positive ? <ThumbUp className="h-6 w-6 text-success" /> : <ThumbDown className="h-6 w-6 text-danger" />}
        <div className="text-sm"><b>{done.positive ? "Thumbs up" : "Thumbs down"}</b> for {seller}.{done.comment ? <span className="block text-muted-foreground">&ldquo;{done.comment}&rdquo;</span> : null}</div>
      </section>
    );
  }
  const base = "flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border-2 text-sm font-semibold transition-colors";
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <h2 className="font-semibold">How was your experience with {seller}?</h2>
        <p className="text-sm text-muted-foreground">A quick review helps other students shop safely.</p>
      </div>
      <div className="flex gap-3" role="radiogroup" aria-label="Rating">
        <button type="button" role="radio" aria-checked={rating === "up"} onClick={() => setRating("up")}
          className={`${base} ${rating === "up" ? "border-success bg-success/10 text-success" : "border-border hover:bg-muted"}`}><ThumbUp />Good</button>
        <button type="button" role="radio" aria-checked={rating === "down"} onClick={() => setRating("down")}
          className={`${base} ${rating === "down" ? "border-danger bg-danger/10 text-danger" : "border-border hover:bg-muted"}`}><ThumbDown />Not good</button>
      </div>
      <textarea name="comment" rows={2} maxLength={300} placeholder="Add a short comment (optional)" className={`${inputCls} h-auto py-3`} />
      <Notice error={state.error} />
      <button disabled={pending || !rating} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
        {pending && <Spinner />}Submit review
      </button>
    </form>
  );
}
