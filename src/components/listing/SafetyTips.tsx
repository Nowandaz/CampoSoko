export function SafetyTips() {
  return (
    <aside aria-label="Safety tips" className="rounded-xl border border-border bg-muted/50 p-4 text-sm">
      <h2 className="font-semibold">Stay safe</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        <li>Meet in public, well-lit campus spots: the library, cafeteria or the main gate with security.</li>
        <li>Bring a friend and inspect items before you pay.</li>
        <li>Avoid paying in full upfront to strangers for goods or services.</li>
        <li>Never share your M-Pesa PIN or any OTP.</li>
      </ul>
    </aside>
  );
}
