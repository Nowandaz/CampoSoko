"use client";
import { startTransition, useActionState, type FormEvent } from "react";

export type FormResult = { error?: string; notice?: string; step?: "code"; email?: string };

/**
 * Like useActionState, but returns an onSubmit handler instead of an action.
 * React 19 clears every uncontrolled field after a form action finishes, which wipes what the
 * user typed when the server returns a validation error. Submitting through onSubmit keeps it.
 * Returns [state, onSubmit, pending, send(formData)].
 */
export function useSafeForm(action: (prev: FormResult, fd: FormData) => Promise<FormResult>, initial: FormResult) {
  const [state, dispatch, pending] = useActionState(action, initial);
  const send = (fd: FormData) => startTransition(() => dispatch(fd));
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    send(new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter));
  };
  return [state, onSubmit, pending, send] as const;
}
