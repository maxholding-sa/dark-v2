import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { protectedRoutePatterns } from "@/config/routes";

/**
 * Auth gate and canonical-host redirect.
 *
 * Security headers are set once in `next.config.ts` rather than being rebuilt
 * per response here — v1 did both, which meant two places to keep in sync and
 * a header set that differed between static and dynamic routes.
 */

const isProtectedRoute = createRouteMatcher([...protectedRoutePatterns]);

export default clerkMiddleware(async (auth, request) => {
  const host = (request.headers.get("host") ?? "").split(":")[0]?.toLowerCase();

  // Documents and the SBC seal are registered against the apex domain.
  if (host === "www.maxmotors.sa") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = "maxmotors.sa";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  if (isProtectedRoute(request)) await auth.protect();

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|mp4|txt|xml)).*)",
    "/(api|trpc)(.*)",
  ],
};
