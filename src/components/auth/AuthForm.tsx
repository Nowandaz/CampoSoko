"use client";
import { useSafeForm } from "@/lib/use-safe-form";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loginWithPassword, requestLoginCode, requestSignupCode, verifyCode } from "@/app/(auth)/actions";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Field, Notice, Spinner, btnPrimary, inputCls } from "@/components/ui/form";

type Campus = { id: string; name: string };
const link = "inline-flex h-10 items-center font-medium text-primary hover:underline";

function CodeStep({ email, next, resend }: { email: string; next: string; resend: (fd: FormData) => void }) {
  const [state, action, pending] = useSafeForm(verifyCode, {});
  const [wait, setWait] = useState(45);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  return (
    <div className="space-y-5">
      <form onSubmit={action} className="space-y-5">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <p className="rounded-lg bg-muted px-3.5 py-3 text-sm text-muted-foreground">
          We sent a 6-digit code to <b className="text-foreground">{email}</b>. It may take a minute. Check spam too.
        </p>
        <Field label="Verification code">
          <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" required autoFocus
            placeholder="000000" className={`${inputCls} text-center font-mono text-xl tracking-[0.4em]`} />
        </Field>
        <Notice error={state.error} />
        <button className={btnPrimary} disabled={pending}>{pending && <Spinner />}{pending ? "Verifying" : "Verify and continue"}</button>
      </form>
      <form action={(fd) => { setWait(45); resend(fd); }} className="text-center text-sm">
        <input type="hidden" name="email" value={email} />
        <button disabled={wait > 0} className="font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
          {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
        </button>
      </form>
    </div>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [reset, setReset] = useState(false);
  const [codeState, codeAction, codePending, codeActionSend] = useSafeForm(requestLoginCode, {});
  const [pwState, pwAction, pwPending] = useSafeForm(loginWithPassword, {});
  if (codeState.step === "code" && codeState.email) {
    return <CodeStep email={codeState.email} next="/set-password" resend={codeActionSend} />;
  }
  if (reset) {
    return (
      <form onSubmit={codeAction} className="space-y-5">
        <p className="rounded-lg bg-muted px-3.5 py-3 text-sm text-muted-foreground">Enter your email. We will send a code, then you can choose a new password.</p>
        <Field label="Email address">
          <input name="email" type="email" autoComplete="email" required placeholder="you@university.ac.ke" className={inputCls} />
        </Field>
        <Notice error={codeState.error} />
        <button className={btnPrimary} disabled={codePending}>{codePending && <Spinner />}{codePending ? "Sending code" : "Send me a code"}</button>
        <p className="text-center text-sm"><button type="button" onClick={() => setReset(false)} className={link}>Back to log in</button></p>
      </form>
    );
  }
  return (
    <form onSubmit={pwAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <Field label="Email address">
        <input name="email" type="email" autoComplete="email" required placeholder="you@university.ac.ke" className={inputCls} />
      </Field>
      <Field label="Password"><PasswordInput name="password" autoComplete="current-password" /></Field>
      <Notice error={pwState.error} />
      <button className={btnPrimary} disabled={pwPending}>{pwPending && <Spinner />}{pwPending ? "Logging in" : "Log in"}</button>
      <p className="text-center text-sm"><button type="button" onClick={() => setReset(true)} className={link}>Forgot password?</button></p>
      <p className="text-center text-sm text-muted-foreground">New to CampoSoko? <Link href="/signup" className={link}>Create an account</Link></p>
    </form>
  );
}

export function SignupForm({ campuses, next }: { campuses: Campus[]; next: string }) {
  const [state, action, pending, actionSend] = useSafeForm(requestSignupCode, {});
  if (state.step === "code" && state.email) return <CodeStep email={state.email} next={`/set-password?next=${encodeURIComponent(next)}`} resend={actionSend} />;
  return (
    <form onSubmit={action} className="space-y-4">
      <Field label="Full name">
        <input name="full_name" autoComplete="name" required minLength={2} placeholder="Jane Wanjiku" className={inputCls} />
      </Field>
      <Field label="Email address">
        <input name="email" type="email" autoComplete="email" required placeholder="you@university.ac.ke" className={inputCls} />
      </Field>
      <Field label="WhatsApp number" hint="Only shown to logged-in users who contact you.">
        <input name="whatsapp" type="tel" autoComplete="tel" placeholder="0712 345 678" required className={inputCls} />
      </Field>
      <Field label="Campus">
        <select name="campus_id" required defaultValue="" className={inputCls}>
          <option value="" disabled>Select your campus</option>
          {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <label className="flex items-start gap-3 pt-1 text-sm text-muted-foreground">
        <input type="checkbox" name="accept" required className="mt-0.5 h-5 w-5 shrink-0 rounded border-border accent-[var(--primary)]" />
        <span>I agree to the <Link href="/terms" className={link}>Terms</Link> and <Link href="/privacy" className={link}>Privacy Policy</Link>.</span>
      </label>
      <Notice error={state.error} />
      <button className={btnPrimary} disabled={pending}>{pending && <Spinner />}{pending ? "Sending code" : "Create account"}</button>
      <p className="text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className={link}>Log in</Link></p>
    </form>
  );
}
