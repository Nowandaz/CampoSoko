"use client";

// Last-resort page if the whole app fails to render. Plain styles on purpose: nothing else can be relied on here.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fff", color: "#292524", display: "grid", minHeight: "100dvh", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div style={{ maxWidth: 420 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#ea580c", margin: "0 auto 16px" }} />
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ color: "#6b645e", margin: "0 0 20px" }}>The site had a problem loading. Please try again in a moment.</p>
          <button onClick={reset} style={{ background: "#ea580c", color: "#fff", border: 0, borderRadius: 8, padding: "12px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Try again</button>
          {error.digest && <p style={{ color: "#6b645e", fontSize: 12, marginTop: 20 }}>Reference: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
