import { type NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/auth"];

/**
 * Refreshes the Supabase session on every request and gates access.
 *
 * Auth gates *both viewing and editing* (SPEC §2): unauthenticated users are
 * bounced to /login for everything except the login flow and per-post public
 * pages (served under /p/* which is allow-listed here).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser() —
  // it keeps the session fresh and avoids hard-to-debug logout bugs.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/p/"); // per-post public share routes

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed-in users shouldn't sit on the login page.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/wiki";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
