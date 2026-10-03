"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { requestLoginCode, requestSignupCode, verifyCode, type FormState } from "@/app/(auth)/actions";

type Campus = { id: string; name: string };
const input = "w-full rounded-xl border border-border bg-card px-4 py-3 text-base outline-none focus:border-primary";
const btn = "w-full rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60";

function Alert({ s }: { s: FormState }) {
  if (s.error) return <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{s.error}</p>;
  if (s.notice) return <p role="status" className="rounded-xl bg-primary-soft px-4 py-3 text-sm">{s.notice}</p>;
  return null;
}

function CodeStep({ email, next, resend }: { email: string; next: string; resend: (fd: FormData) => void }) {
  const [state, action, pending] = useActionState(verifyCode, {});
  const [wait, setWait] = useState(45);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <p className="text-sm text-muted-foreground">We sent a 6-digit code to <b className="text-foreground">{email}</b>. Check spam too.</p>
        <label className="block text-sm font-medium">Verification code
          <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" required autoFocus
            className={`${input} mt-1 text-center text-2xl tracking-[0.5em]`} />
        </label>
        <Alert s={state} />
        <button className={btn} disabled={pending}>{pending ? "Verifying…" : "Verify & continue"}</button>
      </form>
      <form action={(fd) => { setWait(45); resend(fd); }}>
        <input type="hidden" name="email" value={email} />
        <button disabled={wait > 0} className="w-full text-sm text-primary disabled:text-muted-foreground">
          {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
        </button>
      </form>
    </div>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(requestLoginCode, {});
  if (state.step === "code" && state.email) return <CodeStep email={state.email} next={next} resend={action} />;
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-medium">Email
        <input name="email" type="email" autoComplete="email" required className={`${input} mt-1`} />
      </label>
      <Alert s={state} />
      <button className={btn} disabled={pending}>{pending ? "Sending…" : "Send me a code"}</button>
      <p className="text-center text-sm text-muted-foreground">New here? <Link href="/signup" className="text-primary font-medium">Create an account</Link></p>
    </form>
  );
}

export function SignupForm({ campuses, next }: { campuses: Campus[]; next: string }) {
  const [state, action, pending] = useActionState(requestSignupCode, {});
  if (state.step === "code" && state.email) return <CodeStep email={state.email} next={next} resend={action} />;
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-medium">Full name
        <input name="full_name" autoComplete="name" required minLength={2} className={`${input} mt-1`} />
      </label>
      <label className="block text-sm font-medium">Email
        <input name="email" type="email" autoComplete="email" required className={`${input} mt-1`} />
      </label>
      <label className="block text-sm font-medium">WhatsApp number
        <input name="whatsapp" type="tel" autoComplete="tel" placeholder="0712 345 678" required className={`${input} mt-1`} />
        <span className="text-xs text-muted-foreground">Only shown to logged-in users who contact you.</span>
      </label>
      <label className="block text-sm font-medium">Campus
        <select name="campus_id" required defaultValue="" className={`${input} mt-1`}>
          <option value="" disabled>Select your campus</option>
          {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="accept" required className="mt-1 h-5 w-5 accent-[var(--primary)]" />
        <span>I accept the <Link href="/terms" className="text-primary underline">Terms</Link> and <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>.</span>
      </label>
      <Alert s={state} />
      <button className={btn} disabled={pending}>{pending ? "Sending code…" : "Create account"}</button>
      <p className="text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="text-primary font-medium">Log in</Link></p>
    </form>
  );
}
