import {
  convexAuthNextjsProxy,
  nextjsProxyRedirect,
} from "@/lib/convexAuth";

export default convexAuthNextjsProxy(async (request, { isAuthenticated }) => {
  const { pathname } = request.nextUrl;
  const isSignInPage = pathname === "/sign-in";
  const isDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  if (!isSignInPage && !isDashboard) {
    return;
  }
  const authed = await isAuthenticated();
  if (isSignInPage && authed) {
    return nextjsProxyRedirect(request, "/dashboard");
  }
  if (isDashboard && !authed) {
    return nextjsProxyRedirect(request, "/sign-in");
  }
});

export const config = {
  matcher: ["/((?!auth(?:/|$)|_next/static|_next/image|favicon.ico).*)"],
};
