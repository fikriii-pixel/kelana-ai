import { NextRequest, NextResponse } from 'next/server';

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/',
  '/trips',
  '/profile',
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for public routes and API routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/public/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/health'
  ) {
    return NextResponse.next();
  }

  // Check if the route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route => {
    if (route === '/') return pathname === '/';
    return pathname === route || pathname.startsWith(route + '/');
  });

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // For protected routes, pass token from cookies to server components via headers
  const response = NextResponse.next();
  const token = request.cookies.get('auth-token')?.value;
  if (token) {
    response.headers.set('x-auth-token', token);
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
