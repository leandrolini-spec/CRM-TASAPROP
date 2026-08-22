import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE = "ta_access";

function siteIsGated(request: NextRequest) {
  // Rutas que SIEMPRE tienen que quedar accesibles sin el link secreto:
  // las llama gente externa (destinatarios de mail, o el propio Brevo).
  return (
    !request.nextUrl.pathname.startsWith("/baja") &&
    !request.nextUrl.pathname.startsWith("/api/webhooks/")
  );
}

export async function updateSession(request: NextRequest) {
  const accessKey = process.env.SITE_ACCESS_KEY;

  if (accessKey && siteIsGated(request)) {
    const hasCookie = request.cookies.get(ACCESS_COOKIE)?.value === accessKey;
    const keyFromUrl = request.nextUrl.searchParams.get("ta");

    if (!hasCookie && keyFromUrl !== accessKey) {
      // Sin cookie válida ni token en la URL: ni se revela que hay un login.
      return new NextResponse("Not found", { status: 404 });
    }

    if (!hasCookie && keyFromUrl === accessKey) {
      // Primera visita con el link secreto: guarda la cookie y limpia la URL.
      const url = request.nextUrl.clone();
      url.searchParams.delete("ta");
      const response = NextResponse.redirect(url);
      response.cookies.set(ACCESS_COOKIE, accessKey, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 400, // ~400 días, el máximo que aceptan los browsers
        path: "/",
      });
      return response;
    }
  }

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
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isPublicPath =
    isLoginPage ||
    request.nextUrl.pathname.startsWith("/baja") ||
    request.nextUrl.pathname.startsWith("/api/webhooks/");

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
