import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session and gates /admin (role also enforced by RLS in the DB).
export async function proxy(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const needsLogin = ["/admin", "/sell", "/dashboard", "/wanted/new", "/receipts", "/notifications", "/account"];
  if (!data.user && needsLogin.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path)}&notice=login-required`;
    return NextResponse.redirect(url);
  }

  // First-time users must choose a password before using the app (codes are only for verification and resets).
  const free = ["/set-password", "/terms", "/privacy", "/login"];
  if (data.user && !data.user.user_metadata?.has_password && !free.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/set-password";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  if (data.user && (path === "/admin" || path.startsWith("/admin/"))) {
    const { data: p } = await supabase.from("profiles").select("role, suspended").eq("id", data.user.id).single();
    if (p?.role !== "admin" || p.suspended) return NextResponse.redirect(new URL("/?notice=admin-only", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
