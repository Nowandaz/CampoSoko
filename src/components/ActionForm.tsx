"use client";
import { useTransition } from "react";
import { useFeedback } from "./feedback";

type Result = void | { error?: string; notice?: string };
const isRedirect = (e: unknown) => typeof e === "object" && e !== null && String((e as { digest?: string }).digest ?? "").startsWith("NEXT_REDIRECT");

/**
 * A form that runs a server action with themed feedback: an optional confirm dialog first, then a
 * success toast, or an error toast if the action reports or throws an error. Drop-in for <form action={fn}>.
 */
export function ActionForm({ action, success, confirm, danger = false, className, children }: {
  action: (fd: FormData) => Promise<Result>;
  success?: string; confirm?: string; danger?: boolean; className?: string; children: React.ReactNode;
}) {
  const fb = useFeedback();
  const [pending, start] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(form, submitter as HTMLButtonElement | null);
    if (confirm) {
      const label = submitter?.textContent?.trim();
      if (!(await fb.confirm({ message: confirm, confirmLabel: label || "Confirm", danger }))) return;
    }
    start(async () => {
      try {
        const res = await action(fd);
        if (res && typeof res === "object" && res.error) fb.error(res.error);
        else fb.success(res && typeof res === "object" && res.notice ? res.notice : success ?? "Done");
      } catch (err) {
        if (isRedirect(err)) throw err;
        fb.error("That didn't work. Check your connection and try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <fieldset disabled={pending} className="contents">{children}</fieldset>
    </form>
  );
}
