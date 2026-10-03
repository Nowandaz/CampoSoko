"use client";
import { startTransition, useActionState, type FormEvent } from "react";

export type FormResult = { error?: string; notice?: string; step?: "code"; email?: string; done?: "up" | "down" };

/**
 * Like useActionState, but returns an onSubmit handler instead of an action.
 * React 19 clears every uncontrolled field after a form action finishes, which wipes what the
 * user typed when the server returns a validation error. Submitting through onSubmit keeps it.
 * Returns [state, onSubmit, pending, send(formData)].
 */
const isRedirect = (e: unknown) => typeof e === "object" && e !== null && String((e as { digest?: string }).digest ?? "").startsWith("NEXT_REDIRECT");

export function useSafeForm(action: (prev: FormResult, fd: FormData) => Promise<FormResult>, initial: FormResult) {
  // A network drop or an unexpected server error becomes a clear message in the form instead of a crash page.
  const guarded = async (prev: FormResult, fd: FormData): Promise<FormResult> => {
    try { return await action(prev, fd); }
    catch (e) {
      if (isRedirect(e)) throw e;
      return { error: typeof navigator !== "undefined" && !navigator.onLine ? "You appear to be offline. Check your connection and try again." : "Something went wrong on our side. Please try again in a moment." };
    }
  };
  const [state, dispatch, pending] = useActionState(guarded, initial);
  const send = (fd: FormData) => startTransition(() => dispatch(fd));
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    send(new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter));
  };
  return [state, onSubmit, pending, send] as const;
}
