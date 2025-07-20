import { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // No routing changes - just pass through all requests
  return;
}

export const config = {
  // Skip middleware for API routes and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}; 