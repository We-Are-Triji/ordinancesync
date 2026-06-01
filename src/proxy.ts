import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Only /admin subpaths and the admin API require authentication. The /admin
// index itself renders a login interface for signed-out users, so it stays
// reachable. Public routes (/, /chat, /lguportal) are never gated.
const isProtectedPage = createRouteMatcher(["/admin/(.+)"]);
const isProtectedApi = createRouteMatcher(["/api/admin/(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedApi(request)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return;
  }

  if (isProtectedPage(request)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
