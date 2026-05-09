import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/transparency",
  "/share/(.*)",              // shared result pages — no login required
  "/api/webhooks/(.*)",
  "/api/search/(.*)",         // search endpoints used by unauthenticated users
  "/api/interactions",        // interaction check — guests get 5 free uses
  "/api/interactions/(.*)",
  "/api/share/:token",        // reading a shared link — no login required
  "/api/feedback",            // feedback widget — anyone can submit
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const refParam = request.nextUrl.searchParams.get("ref");

  const response = NextResponse.next();

  if (refParam) {
    response.cookies.set("formulens_ref", refParam, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
