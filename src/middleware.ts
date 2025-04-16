import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

// Define routes that should be publicly accessible
// We are explicitly making / and /play public as requested
const isPublicRoute = createRouteMatcher([
  '/',
  '/play',
  '/sign-in(.*)', // Clerk sign-in routes
  '/sign-up(.*)', // Clerk sign-up routes
  // Add any other public static files or API routes here if needed
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // If the route is public, do nothing further.
  if (isPublicRoute(req)) {
    return NextResponse.next(); 
  }

  // For all other routes, protect them.
  // We need to await auth() to get the auth object.
  const { userId } = await auth();
  if (!userId) {
     // If the user is not authenticated, redirect them to the sign-in page.
     // The returnBackUrl parameter preserves the original destination.
     const signInUrl = new URL('/sign-in', req.url)
     signInUrl.searchParams.set('redirect_url', req.url)
     return NextResponse.redirect(signInUrl)
  }
  
  // If the user is authenticated, allow the request to proceed.
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    // Run middleware on API routes as well, as auth() is used within them
    '/((?!_next/static|_next/image|favicon.ico|logo.png).*)',
    '/' // Include the root explicitly
  ],
}; 