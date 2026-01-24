import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define protected routes - /api/v1/* requires authentication
const isProtectedRoute = createRouteMatcher(["/api/v1/(.*)"]);

// Public routes that don't need authentication
const isPublicRoute = createRouteMatcher(["/api/openapi"]);

export default clerkMiddleware(async (auth, req) => {
  // Skip auth for public routes
  if (isPublicRoute(req)) {
    return;
  }

  // Protect API v1 routes
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
