import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// protected routes (but NOT /api/upload)
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/saved-cars(.*)",
  "/reservations(.*)",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(response) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export default clerkMiddleware(async (auth, req) => {
  const isApi = req.nextUrl.pathname.startsWith("/api/");

  if (isApi && req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const { userId } = await auth();

  // If userid is not found on a protected page, user will return to sign in page
  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn();
  }

  const response = NextResponse.next();
  if (isApi) return withCors(response);
  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, AND upload API routes
    "/((?!_next|api/upload|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Run for API routes EXCEPT /api/upload to avoid body size limitations
    "/((?!api/upload)api|trpc)(.*)",
  ],
};

