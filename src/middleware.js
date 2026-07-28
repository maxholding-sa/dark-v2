import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { applyCorsHeaders, applySecurityHeaders, getCorsHeaders } from "@/lib/security";

// protected routes (but NOT /api/upload)
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/saved-cars(.*)",
  "/reservations(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const isApi = req.nextUrl.pathname.startsWith("/api/");
  const origin = req.headers.get("origin");
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();

  // Seal / store docs are registered for apex maxmotors.sa — keep www on the same host.
  if (host === "www.maxmotors.sa") {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = "maxmotors.sa";
    url.port = "";
    return applySecurityHeaders(NextResponse.redirect(url, 308));
  }

  if (isApi && req.method === "OPTIONS") {
    const response = new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
    return applySecurityHeaders(response);
  }

  const { userId } = await auth();

  // If userid is not found on a protected page, user will return to sign in page
  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth();
    return applySecurityHeaders(redirectToSignIn());
  }

  const response = NextResponse.next();
  if (isApi) applyCorsHeaders(response, origin);
  return applySecurityHeaders(response);
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, AND upload API routes
    "/((?!_next|api/upload|api/cars/import|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Run for API routes EXCEPT large-body endpoints (avoids middleware body buffering)
    "/((?!api/upload|api/cars/import)api|trpc)(.*)",
  ],
};

